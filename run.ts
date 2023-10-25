import type { Worker as NodeWorker } from "node:worker_threads";
import type { ChildProcess } from "node:child_process";
import chan, { Channel } from "./chan.ts";
import { isPlainObject } from "./object/index.ts";
import { fromErrorEvent, fromObject } from "./error/index.ts";
import { handleChannelMessage, isChannelMessage, isNode, isBun, isDeno, IsPath } from "./util.ts";
import parallel, {
    BunWorker,
    getMaxParallelism,
    sanitizeModuleId,
    createWorker,
    CallRequest,
    CallResponse,
    isCallResponse,
    wrapArgs,
    unwrapReturnValue
} from "./parallel.ts";

declare var Deno: any;

type PoolRecord = {
    getWorker: Promise<{
        worker: Worker | BunWorker | NodeWorker | ChildProcess;
        workerId: number;
    }>;
    adapter: "worker_threads" | "child_process";
    busy: boolean;
};
const workerPools = new Map<string, PoolRecord[]>();

// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue: (() => void)[] = [];

/**
 * Runs the given `script` in a worker thread and abort the task at any time.
 * 
 * This function is similar to {@link parallel}(), many features applicable to `parallel()` are
 * also applicable to `run()`, except the following:
 * 
 * 1. The `script` can only be a filename, and is relative to the current working directory
 *     (or the current URL) if not absolute.
 * 2. Only one task is allow to run at a time for one worker thread, set {@link run.maxWorkers} to
 *     allow more tasks to be run at the same time if needed.
 * 3. By default, the worker thread is dropped after the task settles, set `keepAlive` option
 *     in order to reused it.
 * 
 * @example
 * ```ts
 * // result
 * const job1 = await run("examples/worker.mjs", ["World"]);
 * console.log(await job1.result()); // Hello, World
 * ```
 * 
 * @example
 * ```ts
 * // iterate
 * const job2 = await run<string, [string[]]>("examples/worker.mjs", [["foo", "bar"]], {
 *     fn: "sequence",
 * });
 * for await (const word of job2.iterate()) {
 *     console.log(word);
 * }
 * // output:
 * // foo
 * // bar
 * ```
 * 
 * @example
 * ```ts
 * // abort
 * const job3 = await run<string, [string]>("examples/worker.mjs", ["foobar"], {
 *    fn: "takeTooLong",
 * });
 * await job3.abort();
 * const [err, res] = await _try(job3.result());
 * console.assert(err === null);
 * console.assert(res === undefined);
 * ```
 */
async function run<R, A extends any[] = any[]>(
    script: string,
    args?: A,
    options?: {
        /** If not set, invoke the default function, otherwise invoke the specified function. */
        fn?: string;
        /** Automatically abort the task when timeout (in milliseconds). */
        timeout?: number;
        /**
         * Instead of dropping the worker after the task has completed, keep it alive so that it can
         * be reused by other tasks.
         */
        keepAlive?: boolean;
        /**
         * Choose whether to use `worker_threads` or `child_process` for running the script.
         * The default setting is `worker_threads`.
         * 
         * In browsers and Deno, this option is ignored and will always use the web worker.
         * 
         * @deprecated Always prefer `worker_threads` over `child_process` since it consumes
         * less system resources. `child_process` support may be removed in the future once
         * considered thoroughly.
         */
        adapter?: "worker_threads" | "child_process";
    }
): Promise<{
    workerId: number;
    /** Retrieves the return value of the function being called. */
    result(): Promise<R>;
    /** Iterates the yield value if the function being called returns a generator. */
    iterate(): AsyncIterable<R>;
    /** Terminates the worker thread and aborts the task. */
    abort(reason?: Error | null): Promise<void>;
}> {
    const maxWorkers = run.maxWorkers || parallel.maxWorkers || await getMaxParallelism;
    const fn = options?.fn || "default";
    let modId = sanitizeModuleId(script);
    let baseUrl: string | undefined = undefined;

    if (isDeno) {
        baseUrl = "file://" + Deno.cwd() + "/";
    } else if (isNode || isBun) {
        if (IsPath.test(modId)) {
            // Only set baseUrl for relative modules, don't set it for node modules.
            baseUrl = "file://" + process.cwd() + "/";
        }
    } else if (typeof location === "object") {
        baseUrl = location.href;
    }

    if (baseUrl) {
        modId = new URL(modId, baseUrl).href;
    }

    const req: CallRequest = {
        type: "call",
        module: modId,
        fn,
        args: args ?? [],
    };
    const adapter = options?.adapter || "worker_threads";
    const workerPool = workerPools.get(adapter)
        ?? (workerPools.set(adapter, []).get(adapter) as PoolRecord[]);
    let poolRecord = workerPool.find(item => !item.busy);

    if (poolRecord) {
        poolRecord.busy = true;
    } else if (workerPool.length < maxWorkers) {
        // Fill the worker pool regardless the current call should keep-alive or not,
        // this will make sure that the total number of workers will not exceed the
        // `run.maxWorkers`. If the the call doesn't keep-alive the worker, it will be
        // cleaned after the call.
        workerPool.push(poolRecord = {
            getWorker: createWorker({ adapter }),
            adapter,
            busy: true,
        });
    } else {
        // Put the current call in the consumer queue if there are no workers available,
        // once an existing call finishes, the queue will pop the its head consumer and
        // retry.
        return new Promise<void>((resolve) => {
            workerConsumerQueue.push(resolve);
        }).then(() => run(modId, args, options));
    }

    let error: unknown = null;
    let result: { value: any; } | undefined;
    let resolver: {
        resolve: (data: any) => void;
        reject: (err: unknown) => void;
    } | undefined;
    let channel: Channel<R> | undefined = undefined;
    let workerId: number;
    let release: () => void;
    let terminate = () => Promise.resolve<void>(void 0);

    const timeout = options?.timeout ? setTimeout(async () => {
        const err = new Error(`operation timeout after ${options.timeout}ms`);
        error = err;
        await terminate();
        handleClose(err, true);
    }, options.timeout) : null;

    const handleMessage = async (msg: any) => {
        if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        } else if (isCallResponse(msg)) {
            timeout && clearTimeout(timeout);

            if (msg.type === "return" || msg.type === "error") {
                if (msg.type === "error") {
                    const err = isPlainObject(msg.error)
                        ? (fromObject(msg.error) ?? msg.error)
                        : msg.error;

                    if (err instanceof Error &&
                        (err.message.includes("not be cloned")
                            || err.stack?.includes("not be cloned") // Node.js v16-
                            || err.message.includes("Do not know how to serialize") // JSON error
                        )
                    ) {
                        Object.defineProperty(err, "stack", {
                            configurable: true,
                            enumerable: false,
                            writable: true,
                            value: (err.stack ? err.stack + "\n    " : "")
                                + `at ${fn} (${modId})`,
                        });
                    }

                    error = err;
                } else {
                    result = { value: unwrapReturnValue(msg.value) };
                }

                options?.keepAlive || await terminate();
                handleClose(null, !options?.keepAlive);
            } else if (msg.type === "yield") {
                const value = unwrapReturnValue(msg.value);

                if (msg.done) {
                    // The final message of yield event is the return value.
                    handleMessage({ type: "return", value } satisfies CallResponse);
                } else {
                    channel?.push(value);
                }
            }
        }
    };

    const handleClose = (err: Error | null, terminated = false) => {
        timeout && clearTimeout(timeout);

        if (!terminated) {
            // Release before resolve.
            release?.();

            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to gain the worker.
                workerConsumerQueue.shift()?.();
            }
        } else if (poolRecord) {
            // Clean the pool before resolve.
            // The `workerPool` of this key in the pool map may have been modified by other
            // routines, we need to retrieve the newest value.
            const remainItems = workerPools.get(adapter)?.filter(record => record !== poolRecord);

            if (remainItems?.length) {
                workerPools.set(adapter, remainItems);
            } else {
                workerPools.delete(adapter);
            }

            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to create new worker.
                workerConsumerQueue.shift()?.();
            }
        }

        if (err) {
            error ??= err;
        }

        if (error) {
            if (resolver) {
                resolver.reject(error);

                if (channel) {
                    channel.close();
                }
            } else if (channel) {
                channel.close(error as Error);
            }
        } else {
            result ??= { value: void 0 };

            if (resolver) {
                resolver.resolve(result.value);
            }

            if (channel) {
                channel.close();
            }
        }
    };

    const safeRemoteCall = async (
        worker: Worker | BunWorker | NodeWorker | ChildProcess,
        req: CallRequest,
        transferable: Transferable[] = [],
    ) => {
        try {
            if (typeof (worker as any)["postMessage"] === "function") {
                (worker as Worker).postMessage(req, transferable);
            } else {
                await new Promise<void>((resolve, reject) => {
                    (worker as ChildProcess).send(req, err => err ? reject(err) : resolve());
                });
            }
        } catch (err) {
            if (typeof (worker as any)["unref"] === "function") {
                (worker as BunWorker | NodeWorker | ChildProcess).unref();
            }

            error = err;
            options?.keepAlive || await terminate();
            handleClose(null, !options?.keepAlive);

            throw err;
        }
    };

    if (isNode || isBun) {
        if (adapter === "child_process") {
            const record = await poolRecord.getWorker;
            const worker = record.worker as ChildProcess;

            workerId = record.workerId;
            worker.ref(); // prevent premature exit in the main thread
            worker.on("message", handleMessage);
            worker.once("exit", (code, signal) => {
                if (!error && !result) {
                    handleClose(new Error(`worker exited (${code ?? signal})`), true);
                }
            });

            release = () => {
                worker.unref(); // allow the main thread to exit if the event loop is empty

                // Remove the event listener so that later calls will not mess up.
                worker.off("message", handleMessage);
                worker.removeAllListeners("exit");
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));

            if (error) {
                // The worker take too long to start and timeout error already thrown.
                await terminate();
                throw error;
            }

            const { args } = wrapArgs(req.args, Promise.resolve(worker));
            req.args = args;
            await safeRemoteCall(worker, req);
        } else if (isNode) {
            const record = await poolRecord.getWorker;
            const worker = record.worker as NodeWorker;
            const handleErrorEvent = (err: Error) => {
                if (!error && !result) {
                    handleClose(err, true); // In Node.js, worker will exit once erred.
                }
            };

            workerId = record.workerId;
            worker.ref();
            worker.on("message", handleMessage);
            worker.once("error", handleErrorEvent);

            release = () => {
                worker.unref();
                worker.off("message", handleMessage);
                worker.off("error", handleErrorEvent);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => void (await worker.terminate());

            if (error) {
                await terminate();
                throw error;
            }

            const { args, transferable } = wrapArgs(req.args, Promise.resolve(worker));
            req.args = args;
            await safeRemoteCall(worker, req, transferable);
        } else { // isBun
            const record = await poolRecord.getWorker;
            const worker = record.worker as BunWorker;
            const handleCloseEvent = ((ev: CloseEvent) => {
                if (!error && !result) {
                    handleClose(new Error(ev.reason + " (" + ev.code + ")"), true);
                }
            }) as EventListener;

            workerId = record.workerId;
            worker.ref();
            worker.onmessage = (ev) => handleMessage(ev.data);
            worker.onerror = () => void worker.terminate(); // terminate once erred
            worker.addEventListener("close", handleCloseEvent);

            release = () => {
                worker.unref();
                worker.onmessage = null;
                worker.onerror = null;
                worker.removeEventListener("close", handleCloseEvent);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(worker.terminate());

            if (error) {
                await terminate();
                throw error;
            }

            const { args, transferable } = wrapArgs(req.args, Promise.resolve(worker));
            req.args = args;
            await safeRemoteCall(worker, req, transferable);
        }
    } else {
        const record = await poolRecord.getWorker;
        const worker = record.worker as Worker;

        workerId = record.workerId;
        worker.onmessage = (ev) => handleMessage(ev.data);
        worker.onerror = (ev) => {
            if (!error && !result) {
                worker.terminate(); // ensure termination
                handleClose(fromErrorEvent(ev) ?? new Error("worker exited"), true);
            }
        };

        release = () => {
            worker.onmessage = null;
            worker.onerror = null;
            poolRecord && (poolRecord.busy = false);
        };
        terminate = () => Promise.resolve(worker.terminate());

        if (error) {
            await terminate();
            throw error;
        }

        const { args, transferable } = wrapArgs(req.args, Promise.resolve(worker));
        req.args = args;
        await safeRemoteCall(worker, req, transferable);
    }

    return {
        workerId,
        async abort(reason = undefined) {
            timeout && clearTimeout(timeout);

            if (reason) {
                if (reason instanceof Error) {
                    error = reason;
                } else if (typeof reason === "string") {
                    error = new Error(reason);
                } else {
                    // @ts-ignore
                    error = new Error("operation aborted", { cause: reason });
                }
            } else {
                result = { value: void 0 };
            }

            await terminate();
            handleClose(null, true);
        },
        async result() {
            return await new Promise<any>((resolve, reject) => {
                if (error) {
                    reject(error);
                } else if (result) {
                    resolve(result.value);
                } else {
                    resolver = { resolve, reject };
                }
            });
        },
        iterate() {
            if (resolver) {
                throw new Error("result() has been called");
            } else if (result) {
                throw new TypeError("the response is not iterable");
            }

            channel = chan<R>(Infinity);

            return {
                [Symbol.asyncIterator]: channel[Symbol.asyncIterator].bind(channel),
            };
        },
    };
}

namespace run {
    /**
     * The maximum number of workers allowed to exist at the same time. If not set, use the same
     * setting as {@link parallel.maxWorkers}.
     */
    export var maxWorkers: number | undefined = undefined;
    /** @deprecated set {@link parallel.workerEntry} instead */
    export declare var workerEntry: string | undefined;
}
// backward compatibility
Object.defineProperties(run, {
    workerEntry: {
        set(v) {
            parallel.workerEntry = v;
        },
        get() {
            return parallel.workerEntry;
        },
    },
});

export default run;
