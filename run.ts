import type { Worker as NodeWorker } from "node:worker_threads";
import type { ChildProcess } from "node:child_process";
import parallel, { FFIResponse, createFFIRequest, createWorker, isFFIResponse, sanitizeModuleId } from "./parallel.ts";
import chan, { Channel } from "./chan.ts";
import deprecate from "./deprecate.ts";
import { fromObject } from "./error/index.ts";
import { isNode } from "./util.ts";

let workerPool: {
    workerId: number;
    worker: Worker | NodeWorker | ChildProcess;
    adapter: "worker_threads" | "child_process";
    busy: boolean;
}[] = [];

// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue: (() => void)[] = [];

/**
 * Runs the given `script` in a worker thread or child process.
 * 
 * In Node.js and Bun, the `script` can be either a CommonJS module or an ES module, and is relative
 * to the current working directory if not absolute.
 * 
 * In browser and Deno, the `script` can only be an ES module, and is relative to the current URL
 * (or working directory for Deno) if not absolute.
 * 
 * In Bun and Deno, the `script` can also be a TypeScript file.
 * 
 * NOTE: This function also uses `parallel.maxWorkers` and `parallel.workerEntry` for worker
 * configuration.
 * 
 * @example
 * ```ts
 * const job1 = await run("examples/worker.mjs", ["World"]);
 * console.log(await job1.result()); // Hello, World
 * ```
 * 
 * @example
 * ```ts
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
         * In browser or Deno, this option is ignored and will always use the web worker.
         */
        adapter?: "worker_threads" | "child_process";
        /**
         * @deprecated set `run.workerEntry` instead.
         */
        workerEntry?: string;
    }
): Promise<{
    workerId: number;
    /** Retrieves the return value of the function that has been called. */
    result(): Promise<R>;
    /** Iterates the yield value if the function returns a generator. */
    iterate(): AsyncIterable<R>;
    /** Terminates the worker thread and aborts the task. */
    abort(reason?: unknown): Promise<void>;
}>;
/**
 * @deprecated
 * This function signature is deprecated, because it's confuses people for reading
 * the purpose of the function call and the real path of the script is controversial.
 * 
 * @param script A function containing a dynamic import expression, only used for TypeScript to
 *  infer types in the given module, the module is never imported into the current program.
 * 
 * @example
 * ```ts
 * const job4 = await run(() => import("./examples/worker.mjs"), ["World"]);
 * console.log(await job4.result()); // Hello, World
 * ```
 */
async function run<M extends { [x: string]: any; }, A extends Parameters<M[Fn]>, Fn extends keyof M = "default">(
    script: () => Promise<M>,
    args?: A,
    options?: {
        fn?: Fn;
        timeout?: number;
        keepAlive?: boolean;
        adapter?: "worker_threads" | "child_process";
    }
): Promise<{
    workerId: number;
    result(): Promise<ReturnType<M[Fn]> extends (AsyncGenerator<any, infer R, any> | Generator<any, infer R, any>) ? R : Awaited<ReturnType<M[Fn]>>>;
    iterate(): AsyncIterable<ReturnType<M[Fn]> extends (AsyncGenerator<infer Y, any, any> | Generator<infer Y, any, any>) ? Y : Awaited<ReturnType<M[Fn]>>>;
    abort(reason?: unknown): Promise<void>;
}>;
async function run<R, A extends any[] = any[]>(
    script: string | (() => Promise<any>),
    args: A | undefined = undefined,
    options: {
        fn?: string;
        timeout?: number;
        keepAlive?: boolean;
        adapter?: "worker_threads" | "child_process";
        /** @deprecated */
        workerEntry?: string;
    } | undefined = undefined
): Promise<{
    workerId: number;
    result(): Promise<R>;
    iterate(): AsyncIterable<R>;
    abort(reason?: unknown): Promise<void>;
}> {
    if (options?.workerEntry) {
        deprecate("options.workerEntry", run, "set `run.workerEntry` instead");
    }

    const modId = sanitizeModuleId(script);
    const msg = createFFIRequest({
        script: modId,
        fn: options?.fn || "default",
        args: args ?? [],
    });
    const entry = options?.workerEntry || parallel.workerEntry;
    let error: unknown = null;
    let result: { value: any; } | undefined;
    let resolver: {
        resolve: (data: any) => void;
        reject: (err: unknown) => void;
    } | undefined;
    let channel: Channel<R> | undefined = undefined;
    let workerId: number | undefined;
    let poolRecord: typeof workerPool[0] | undefined;
    let release: () => void;
    let terminate = () => Promise.resolve<void>(void 0);
    const timeout = options?.timeout ? setTimeout(() => {
        const err = new Error(`operation timeout after ${options.timeout}ms`);

        if (resolver) {
            resolver.reject(err);
        } else {
            error = err;
        }

        terminate();
    }, options.timeout) : null;

    const handleMessage = (msg: any) => {
        if (isFFIResponse(msg)) {
            timeout && clearTimeout(timeout);

            if (msg.type === "error") {
                return handleError(msg.error);
            } else if (msg.type === "return") {
                if (options?.keepAlive) {
                    // Release before resolve.
                    release?.();

                    if (workerConsumerQueue.length) {
                        // Queued consumer now has chance to gain the worker.
                        workerConsumerQueue.shift()?.();
                    }
                } else {
                    terminate();
                }

                if (resolver) {
                    resolver.resolve(msg.value);
                } else {
                    result = { value: msg.value };
                }

                channel?.close();
            } else if (msg.type === "yield") {
                if (msg.done) {
                    // The final message of yield event is the return value.
                    handleMessage({ type: "return", value: msg.value } satisfies FFIResponse);
                } else {
                    channel?.push(msg.value);
                }
            }
        }
    };
    const handleError = (err: unknown) => {
        err = err instanceof Error
            ? err
            : (typeof err === "object" ? fromObject(err as Object) : err);
        error = err;
        timeout && clearTimeout(timeout);

        if (resolver) {
            resolver.reject(err);
        }

        channel?.close(err as Error);
    };
    const handleExit = () => {
        timeout && clearTimeout(timeout);

        if (poolRecord) {
            // Clean the pool before resolve.
            workerPool = workerPool.filter(record => record !== poolRecord);

            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to create new worker.
                workerConsumerQueue.shift()?.();
            }
        }

        if (resolver) {
            error ? resolver.reject(error) : resolver.resolve(void 0);
        } else if (!error && !result) {
            result = { value: void 0 };
        }

        channel?.close(error as Error);
    };

    if (isNode) {
        if (options?.adapter === "child_process") {
            let worker: ChildProcess;
            let ok = true;
            poolRecord = workerPool.find(item => {
                return item.adapter === "child_process" && !item.busy;
            });

            if (poolRecord) {
                worker = poolRecord.worker as ChildProcess;
                workerId = poolRecord.workerId;
                poolRecord.busy = true;
            } else if (workerPool.length < parallel.maxWorkers) {
                const res = await createWorker({ entry, adapter: "child_process" });
                worker = res.worker as ChildProcess;
                workerId = res.workerId;
                ok = await new Promise<boolean>((resolve) => {
                    worker.once("exit", () => {
                        if (error) {
                            // The child process took too long to start and cause timeout error.
                            resolve(false);
                        }
                    });
                    worker.once("message", () => {
                        worker.removeAllListeners("exit");
                        resolve(true);
                    });
                });

                // Fill the worker pool regardless the current call should keep-alive or not,
                // this will make sure that the total number of workers will not exceed the
                // `run.maxWorkers`. If the the call doesn't keep-alive the worker, it will be
                // cleaned after the call.
                ok && workerPool.push(poolRecord = {
                    workerId,
                    worker,
                    adapter: "child_process",
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

            release = () => {
                worker.unref(); // allow the main thread to exit if the event loop is empty
                // Remove the event listener so that later calls will not mess up.
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));

            if (ok) {
                worker.ref(); // prevent premature exit in the main thread
                worker.send(msg);
                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("exit", handleExit);
            }
        } else {
            let worker: NodeWorker;
            let ok = true;
            poolRecord = workerPool.find(item => {
                return item.adapter === "worker_threads" && !item.busy;
            });

            if (poolRecord) {
                worker = poolRecord.worker as NodeWorker;
                workerId = poolRecord.workerId;
                poolRecord.busy = true;
            } else if (workerPool.length < parallel.maxWorkers) {
                const res = await createWorker({ entry, adapter: "worker_threads" });
                worker = res.worker as NodeWorker;
                workerId = res.workerId;
                ok = await new Promise<boolean>((resolve) => {
                    worker.once("exit", () => {
                        if (error) {
                            // The child process took too long to start and cause timeout error.
                            resolve(false);
                        }
                    });
                    worker.once("online", () => {
                        worker.removeAllListeners("exit");
                        resolve(true);
                    });
                });
                ok && workerPool.push(poolRecord = {
                    workerId,
                    worker,
                    adapter: "worker_threads",
                    busy: true,
                });
            } else {
                return new Promise<void>((resolve) => {
                    workerConsumerQueue.push(resolve);
                }).then(() => run(modId, args, options));
            }

            release = () => {
                worker.unref();
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => void (await worker.terminate());

            if (ok) {
                worker.ref();
                worker.postMessage(msg);
                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("messageerror", handleError);
                worker.once("exit", handleExit);
            }
        }
    } else {
        let worker: Worker;
        poolRecord = workerPool.find(item => {
            return item.adapter === "worker_threads" && !item.busy;
        });

        if (poolRecord) {
            worker = poolRecord.worker as Worker;
            workerId = poolRecord.workerId;
            poolRecord.busy = true;
        } else if (workerPool.length < parallel.maxWorkers) {
            const res = await createWorker({ entry });
            worker = res.worker as Worker;
            workerId = res.workerId;
            workerPool.push(poolRecord = {
                workerId,
                worker,
                adapter: "worker_threads",
                busy: true,
            });
        } else {
            return new Promise<void>((resolve) => {
                workerConsumerQueue.push(resolve);
            }).then(() => run(modId, args, options));
        }

        release = () => {
            worker.onmessage = null;
            poolRecord && (poolRecord.busy = false);
        };
        terminate = async () => {
            await Promise.resolve(worker.terminate());
            handleExit();
        };

        worker.postMessage(msg);
        worker.onmessage = (ev) => handleMessage(ev.data);
        worker.onerror = (ev) => handleMessage(ev.error || new Error(ev.message));
        worker.onmessageerror = () => {
            handleError(new Error("unable to deserialize the message"));
        };
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
            }

            await terminate();
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

declare namespace run {
    /** @deprecated set `parallel.maxWorkers` instead */
    var maxWorkers: number;
    /** @deprecated set `parallel.workerEntry` instead */
    var workerEntry: string;
}
// backward compatibility
Object.defineProperties(run, {
    maxWorkers: {
        set(v) {
            parallel.maxWorkers = v;
        },
        get() {
            return parallel.maxWorkers;
        },
    },
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
