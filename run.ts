/**
 * Runs a script in a worker thread and invokes its `default` function to
 * collect the result.
 * @module
 */

import type { ChildProcess } from "node:child_process";
import chan, { Channel } from "./chan.ts";
import { isPlainObject } from "./object.ts";
import { fromErrorEvent, fromObject, throwUnsupportedRuntimeError } from "./error.ts";
import { cwd, isAbsolute, toFileUrl } from "./path.ts";
import { isNode, isBun, isBrowserWindow } from "./env.ts";
import { BunWorker, NodeWorker, CallRequest, CallResponse } from "./parallel/types.ts";
import { sanitizeModuleId } from "./parallel/module.ts";
import { handleChannelMessage, isChannelMessage } from "./parallel/channel.ts";
import {
    getMaxParallelism,
    createWorker,
    isCallResponse,
    wrapArgs,
    unwrapReturnValue,
} from "./parallel/threads.ts";
import parallel from "./parallel.ts";
import { unrefTimer } from "./runtime.ts";
import { AsyncTask, abortWith, asyncTask } from "./async.ts";

type PoolRecord = {
    getWorker: Promise<{
        worker: Worker | BunWorker | NodeWorker | ChildProcess;
        workerId: number;
    }>;
    adapter: "worker_threads" | "child_process";
    busy: boolean;
    lastAccess: number;
};
const workerPools = new Map<string, PoolRecord[]>();
let gcTimer: number | NodeJS.Timeout;

// The worker consumer queue is nothing but a callback list, once a worker is
// available, the runner pop a consumer and run the callback, which will retry
// gaining the worker and retry the task.
const workerConsumerQueue: (() => void)[] = [];

/**
 * Options for the {@link run} function.
 */
export interface RunOptions {
    /**
     * If not set, invoke the `default` function, otherwise invoke the specified
     * function.
     */
    fn?: string;
    /** Automatically abort the task when timeout (in milliseconds). */
    timeout?: number;
    /**
     * Instead of dropping the worker after the task has completed, keep it
     * alive so that it can be reused by other tasks.
     */
    keepAlive?: boolean;
    /**
     * Choose whether to use `worker_threads` or `child_process` for running
     * the script. The default setting is `worker_threads`.
     * 
     * In browsers, this option is ignored and will always use the web worker.
     * 
     * Always prefer `worker_threads` over `child_process` if possible, because
     * it is more efficient and has better performance.
     * 
     * For users who use [tsx](https://www.npmjs.com/package/tsx) to run
     * TypeScript directly in Node.js, the runtime is unable to use TypeScript
     * directly in worker threads at the moment, to run TypeScript, we need to
     * use `child_process` adapter.
     * See [this issue](https://github.com/privatenumber/tsx/issues/354) for more
     * information.
     */
    adapter?: "worker_threads" | "child_process";
    /**
     * Instead of aborting the task by calling the `abort()` method manually,
     * we can use an `AbortSignal` to abort the task automatically when the
     * signal is aborted.
     */
    signal?: AbortSignal;
}

/**
 * The return value of the {@link run} function.
 */
export interface WorkerTask<R> {
    /**
     * The ID of the worker thread that runs the task.
     */
    workerId: number;
    /**
     * Retrieves the return value of the function being called.
     */
    result(): Promise<R>;
    /**
     * Iterates the yield value if the function being called returns a generator.
     */
    iterate(): AsyncIterable<R>;
    /**
     * Terminates the worker thread and aborts the task. If `reason` is provided,
     * `result()` or `iterate()` will throw that error. Otherwise, an `AbortError`
     * will be thrown.
     */
    abort(reason?: any): void;
}

/**
 * Runs the given `script` in a worker thread and invokes its `default` function
 * to collect the result.
 * 
 * This function is similar to {@link parallel}(), many features and
 * restrictions applicable to `parallel()` are also applicable to `run()`,
 * except the following:
 * 
 * 1. The `script` can only be a filename, and is relative to the current
 *   working directory (or the current URL) if not absolute.
 * 2. Only one task is allow to run at a time for one worker thread, set
 *   {@link run.maxWorkers} to allow more tasks to be run at the same time if
 *   needed.
 * 3. By default, the worker thread is dropped after the task settles, set
 *   `keepAlive` option in order to reuse it.
 * 4. This function is not intended to be used in the browser, because it takes
 *   a bare filename as argument, which will not be transformed to a proper URL
 *   if the program is to be bundled.
 * 
 * @example
 * ```ts
 * // result
 * import run from "@ayonli/jsext/run";
 * 
 * const job1 = await run("examples/worker.mjs", ["World"]);
 * console.log(await job1.result()); // Hello, World
 * ```
 * 
 * @example
 * ```ts
 * // iterate
 * import run from "@ayonli/jsext/run";
 * 
 * const job2 = await run<string, [string[]]>(
 *     "examples/worker.mjs",
 *     [["foo", "bar"]],
 *     { fn: "sequence" } // sequence is a generator function
 * );
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
 * import run from "@ayonli/jsext/run";
 * import _try from "@ayonli/jsext/try";
 * 
 * const job3 = await run<string, [string]>("examples/worker.mjs", ["foobar"], {
 *    fn: "takeTooLong",
 * });
 * job3.abort();
 * const [err, res] = await _try(job3.result());
 * console.assert((err as DOMException)?.name === "AbortError");
 * console.assert(res === undefined);
 * ```
 */
async function run<R, A extends any[] = any[]>(
    script: string | URL,
    args?: A,
    options?: RunOptions
): Promise<WorkerTask<R>> {
    if (!isNode && typeof Worker !== "function") {
        throwUnsupportedRuntimeError();
    }

    script = typeof script === "string" ? script : script.href;
    const maxWorkers = run.maxWorkers || parallel.maxWorkers || await getMaxParallelism;

    if (options?.signal?.aborted) {
        throw options.signal.reason;
    }

    const fn = options?.fn || "default";
    let modId = sanitizeModuleId(script);
    let baseUrl: string | undefined = undefined;

    if (isBrowserWindow) { // browser main thread
        baseUrl = location.href;
    } else if (!isAbsolute(modId)) {
        try {
            baseUrl = toFileUrl(cwd()) + "/"; // must ends with `/`
        } catch { // `cwd()` may fail in unsupported environments or being rejected
            baseUrl = "";
        }
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
        poolRecord.lastAccess = Date.now();
    } else if (workerPool.length < maxWorkers) {
        // Fill the worker pool regardless the current call should keep-alive
        // or not, this will make sure that the total number of workers will not
        // exceed the `run.maxWorkers`. If the the call doesn't keep-alive the
        // worker, it will be cleaned after the call.
        workerPool.push(poolRecord = {
            getWorker: createWorker({ parallel, adapter }),
            adapter,
            busy: true,
            lastAccess: Date.now(),
        });

        if (!gcTimer) {
            gcTimer = setInterval(() => {
                workerPools.forEach((workerPool, adapter) => {
                    // GC: clean long-time unused workers
                    const now = Date.now();
                    const idealItems: PoolRecord[] = [];

                    workerPools.set(adapter, workerPool.filter(item => {
                        const ideal = !item.busy
                            && (now - item.lastAccess) >= 10_000;

                        if (ideal) {
                            idealItems.push(item);
                        }

                        return !ideal;
                    }));

                    idealItems.forEach(async item => {
                        const { worker } = await item.getWorker;

                        if (typeof (worker as any)["terminate"] === "function") {
                            await (worker as Worker | BunWorker | NodeWorker)
                                .terminate();
                        } else {
                            (worker as ChildProcess).kill();
                        }
                    });
                });
            }, 1_000);

            unrefTimer(gcTimer);
        }
    } else {
        // Put the current call in the consumer queue if there are no workers
        // available, once an existing call finishes, the queue will pop the its
        // head consumer and retry.
        return new Promise<void>((resolve) => {
            workerConsumerQueue.push(resolve);
        }).then(() => run(modId, args, options));
    }

    let error: unknown = null;
    let result: { value: any; } | undefined;
    let promise: AsyncTask<any> | undefined;
    let channel: Channel<R> | undefined = undefined;
    let workerId: number;
    let release: () => void;
    let terminate = () => Promise.resolve<void>(void 0);

    const controller = options?.timeout || options?.signal ? abortWith({
        timeout: options?.timeout,
        parent: options?.signal,
    }) : new AbortController();
    const { signal } = controller;

    signal.addEventListener("abort", () => {
        if (error || result) {
            return; // If the task has already settled, ignore the abort event.
        }

        error = signal.reason;
        terminate().then(() => {
            handleClose(error, true);
        });
    });

    const handleMessage = async (msg: any) => {
        if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        } else if (isCallResponse(msg)) {
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
                    handleMessage({
                        type: "return",
                        value,
                    } satisfies CallResponse);
                } else {
                    channel?.send(value);
                }
            }
        }
    };

    const handleClose = (err: unknown, terminated = false) => {
        if (!terminated) {
            // Release before resolve.
            release?.();

            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to gain the worker.
                workerConsumerQueue.shift()?.();
            }
        } else if (poolRecord) {
            // Clean the pool before resolve.
            // The `workerPool` of this key in the pool map may have been
            // modified by other routines, we need to retrieve the newest value.
            const remainItems = workerPools.get(adapter)
                ?.filter(record => record !== poolRecord);

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
            if (promise) {
                promise.reject(error);

                if (channel) {
                    channel.close();
                }
            } else if (channel) {
                if (error instanceof Error) {
                    channel.close(error);
                } else if (typeof error === "string") {
                    channel.close(new Error(error));
                } else {
                    // @ts-ignore
                    channel.close(new Error("unknown error", { cause: error }));
                }
            }
        } else {
            result ??= { value: void 0 };

            if (promise) {
                promise.resolve(result.value);
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
                    (worker as ChildProcess).send(req, err => {
                        err ? reject(err) : resolve();
                    });
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
                    handleClose(
                        new Error(`worker exited (${code ?? signal})`),
                        true
                    );
                }
            });

            release = () => {
                // allow the main thread to exit if the event loop is empty
                worker.unref();

                // Remove the event listener so that later calls will not mess
                // up.
                worker.off("message", handleMessage);
                worker.removeAllListeners("exit");
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));

            if (error) {
                // The worker take too long to start and timeout error already
                // thrown.
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
                    // In Node.js, worker will exit once erred.
                    handleClose(err, true);
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

            const {
                args,
                transferable,
            } = wrapArgs(req.args, Promise.resolve(worker));
            req.args = args;
            await safeRemoteCall(worker, req, transferable);
        } else { // isBun
            const record = await poolRecord.getWorker;
            const worker = record.worker as BunWorker;
            const handleCloseEvent = ((ev: CloseEvent) => {
                if (!error && !result) {
                    handleClose(
                        new Error(ev.reason + " (" + ev.code + ")"),
                        true
                    );
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
                // @ts-ignore
                worker.onerror = null;
                worker.removeEventListener("close", handleCloseEvent);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(worker.terminate());

            if (error) {
                await terminate();
                throw error;
            }

            const {
                args,
                transferable,
            } = wrapArgs(req.args, Promise.resolve(worker));
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
                handleClose(
                    fromErrorEvent(ev) ?? new Error("worker exited"),
                    true
                );
            }
        };

        release = () => {
            worker.onmessage = null;
            // @ts-ignore
            worker.onerror = null;
            poolRecord && (poolRecord.busy = false);
        };
        terminate = () => Promise.resolve(worker.terminate());

        if (error) {
            await terminate();
            throw error;
        }

        const {
            args,
            transferable,
        } = wrapArgs(req.args, Promise.resolve(worker));
        req.args = args;
        await safeRemoteCall(worker, req, transferable);
    }

    const task: WorkerTask<R> = {
        workerId,
        abort(reason = undefined) {
            controller.abort(reason);
        },
        async result() {
            const task = asyncTask<R>();

            if (error) {
                task.reject(error);
            } else if (result) {
                task.resolve(result.value);
            } else {
                promise = task;
            }

            return await task;
        },
        iterate() {
            if (promise) {
                throw new TypeError("result() has been called.");
            } else if (result) {
                throw new TypeError("The response is not iterable.");
            }

            channel = chan<R>(Infinity);

            return {
                [Symbol.asyncIterator]: channel[Symbol.asyncIterator].bind(channel),
            };
        },
    };

    return task;
}

namespace run {
    /**
     * The maximum number of workers allowed to exist at the same time.
     * If not set, use the same setting as {@link parallel.maxWorkers}.
     */
    export var maxWorkers: number | undefined = undefined;
}

export default run;
