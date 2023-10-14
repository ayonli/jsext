import type { Worker as NodeWorker } from "node:worker_threads";
import type { ChildProcess } from "node:child_process";
import { sequence } from "./number/index.ts";
import { trim } from "./string/index.ts";
import chan, { Channel } from "./chan.ts";
import deprecate from "./deprecate.ts";
import {
    ThenableAsyncGenerator,
    ThenableAsyncGeneratorLike
} from "./external/thenable-generator/index.ts";

const isNode = typeof process === "object" && !!process.versions?.node;
declare var Deno: any;

const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
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
 * Runs the given `script` in a worker thread or child process for CPU-intensive or abortable tasks.
 * 
 * In Node.js and Bun, the `script` can be either a CommonJS module or an ES module, and is relative
 * to the current working directory if not absolute.
 * 
 * In browser and Deno, the `script` can only be an ES module, and is relative to the current URL
 * (or working directory for Deno) if not absolute.
 * 
 * In Bun and Deno, the `script` can also be a TypeScript file.
 * 
 * @example
 * ```ts
 * const job1 = await run("./job-example.mjs", ["World"]);
 * console.log(await job1.result()); // Hello, World
 * ```
 * 
 * @example
 * ```ts
 * const job2 = await run<string, [string[]]>("./job-example.mjs", [["foo", "bar"]], {
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
 * const job3 = await run<string, [string]>("./job-example.mjs", ["foobar"], {
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
         * 
         * Be aware, keep-alive with `child_process` adapter will prevent the main process to exit
         * in Node.js.
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
    /** Terminates the worker and abort the task. */
    abort(): Promise<void>;
    /** Retrieves the return value of the function that has been called. */
    result(): Promise<R>;
    /** Iterates the yield value if the function returns a generator. */
    iterate(): AsyncIterable<R>;
}>;
/**
 * @param script A function containing a dynamic import expression, only used for TypeScript to
 *  infer types in the given module, the module is never imported into the current program.
 * 
 * @example
 * ```ts
 * const job4 = await run(() => import("./job-example.mjs"), ["World"]);
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
    abort(): Promise<void>;
    result(): Promise<ReturnType<M[Fn]> extends AsyncGenerator<any, infer R, any> ? R : Awaited<ReturnType<M[Fn]>>>;
    iterate(): AsyncIterable<ReturnType<M[Fn]> extends AsyncGenerator<infer Y, any, any> ? Y : Awaited<ReturnType<M[Fn]>>>;
}>;
async function run<R, A extends any[] = any[]>(
    script: string | (() => Promise<any>),
    args: A | undefined = undefined,
    options: {
        fn?: string;
        timeout?: number;
        keepAlive?: boolean;
        adapter?: "worker_threads" | "child_process";
        workerEntry?: string;
    } | undefined = undefined
): Promise<{
    workerId: number;
    /** Terminates the worker and abort the task. */
    abort(): Promise<void>;
    /** Retrieves the return value of the function that has been called. */
    result(): Promise<R>;
    /** Iterates the yield value if the function returns a generator. */
    iterate(): AsyncIterable<R>;
}> {
    let _script = "";

    if (typeof script === "function") {
        let str = script.toString();
        let start = str.lastIndexOf("(");

        if (start === -1) {
            throw new TypeError("the given script is not a dynamic import expression");
        } else {
            start += 1;
            const end = str.indexOf(")", start);
            _script = trim(str.slice(start, end), ` '"\'`);
        }
    } else {
        _script = script;
    }

    const msg = {
        type: "ffi",
        script: _script,
        baseUrl: "",
        fn: options?.fn || "default",
        args: args ?? [],
    };

    if (typeof Deno === "object") {
        msg.baseUrl = "file://" + Deno.cwd() + "/";
    } else if (isNode) {
        msg.baseUrl = "file://" + process.cwd() + "/";
    } else if (typeof location === "object") {
        msg.baseUrl = location.href;
    }

    if (options?.workerEntry) {
        deprecate("options.workerEntry", run, "set `run.workerEntry` instead");
    }

    let entry = options?.workerEntry || run.workerEntry;
    let error: Error | null = null;
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
        if (msg && typeof msg === "object" && typeof msg.type === "string") {
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

                if (channel) {
                    channel.close();
                }
            } else if (msg.type === "yield") {
                if (msg.done) {
                    // The final message of yield event is the return value.
                    handleMessage({ type: "return", value: msg.value });
                } else {
                    channel?.push(msg.value);
                }
            }
        }
    };

    const handleError = (err: Error | null) => {
        timeout && clearTimeout(timeout);

        if (resolver) {
            resolver.reject(err);
        } else {
            error = err;
        }

        if (channel) {
            channel.close(err);
        }
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
            resolver.resolve(void 0);
        } else if (!error && !result) {
            result = { value: void 0 };
        }

        if (channel) {
            channel.close();
        }
    };

    if (isNode) {
        if (!entry) {
            const path = await import("path");
            const { fileURLToPath } = await import("url");
            const _filename = fileURLToPath(import.meta.url);
            const _dirname = path.dirname(_filename);

            if (_filename === process.argv[1]) {
                // The code is bundled, try the worker entry in node_modules (if it exists).
                entry = "./node_modules/@ayonli/jsext/bundle/worker.mjs";
            } else if ([
                path.join("jsext", "cjs"),
                path.join("jsext", "esm"),
                path.join("jsext", "bundle")
            ].some(path => _dirname.endsWith(path))) { // compiled
                entry = path.join(path.dirname(_dirname), "bundle", "worker.mjs");
            } else {
                entry = path.join(_dirname, "worker.mjs");
            }
        }

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
            } else if (workerPool.length < run.maxWorkers) {
                const { fork } = await import("child_process");
                const isPrior14 = parseInt(process.version.slice(1)) < 14;
                worker = fork(entry, {
                    stdio: "inherit",
                    serialization: isPrior14 ? "advanced" : "json",
                });
                workerId = worker.pid as number;
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
                }).then(() => run(_script, args, options));
            }

            release = () => {
                // Remove the event listener so that later calls will not mess up.
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));

            if (ok) {
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
            } else if (workerPool.length < run.maxWorkers) {
                const { Worker } = await import("worker_threads");
                worker = new Worker(entry);
                // `threadId` may not exist in Bun.
                workerId = worker.threadId ?? workerIdCounter.next().value as number;
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
                }).then(() => run(_script, args, options));
            }

            release = () => {
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => void (await worker.terminate());

            if (ok) {
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
        } else if (workerPool.length < run.maxWorkers) {
            let url: string;

            if (typeof Deno === "object") {
                // Deno can load the module regardless of MINE type.
                if (entry) {
                    url = entry;
                } else if ((import.meta as any)["main"]) {
                    // code is bundled, try the remote URL
                    url = "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                } else {
                    url = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker-web.mjs"
                    ].join("/");
                }
            } else {
                const _url = entry || "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                const res = await fetch(_url);
                let blob: Blob;

                if (res.headers.get("content-type")?.includes("/javascript")) {
                    blob = await res.blob();
                } else {
                    const buf = await res.arrayBuffer();
                    blob = new Blob([new Uint8Array(buf)], {
                        type: "application/javascript",
                    });
                }

                url = URL.createObjectURL(blob);
            }

            worker = new Worker(url, { type: "module" });
            workerId = workerIdCounter.next().value as number;
            workerPool.push(poolRecord = {
                workerId,
                worker,
                adapter: "worker_threads",
                busy: true,
            });
        } else {
            return new Promise<void>((resolve) => {
                workerConsumerQueue.push(resolve);
            }).then(() => run(_script, args, options));
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
        async abort() {
            timeout && clearTimeout(timeout);
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

namespace run {
    /**
     * The maximum number of workers allowed to exist at the same time.
     */
    export var maxWorkers = 16;

    /**
     * In browser, by default, the program loads the worker entry directly from GitHub,
     * which could be slow due to poor internet connection, we can copy the entry file
     * `bundle/worker-web.mjs` to a local path of our website and set this option to that path
     * so that it can be loaded locally.
     * 
     * Or, if the code is bundled, the program won't be able to automatically locate the entry
     * file in the file system, in such case, we can also copy the entry file
     * (`bundle/worker.mjs` for Node.js and Bun, `bundle/worker-web.mjs` for browser and Deno)
     * to a local directory and supply this option instead.
     */
    export var workerEntry: string | undefined;
}

export default run;

/**
 * Creates a remote module wrapper whose functions are run in another thread.
 * 
 * This function uses `run()` under the hood, and the remote function must be async.
 * 
 * @example
 * ```ts
 * const mod = link(() => import("./job-example.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 * 
 * @example
 * ```ts
 * const mod = link(() => import("./job-example.mjs"));
 * 
 * for await (const word of mod.sequence(["foo", "bar"])) {
 *     console.log(word);
 * }
 * // output:
 * // foo
 * // bar
 * ```
 */
export function link<M extends { [x: string]: any; }>(mod: () => Promise<M>, options: {
    /** Automatically abort the task when timeout (in milliseconds). */
    timeout?: number;
    /**
     * Instead of dropping the worker after the task has completed, keep it alive so that it can
     * be reused by other tasks.
     * 
     * Be aware, keep-alive with `child_process` adapter will prevent the main process to exit in
     * Node.js.
     * 
     * Unlink `run()`, this option is enabled by default in `link()`, set its value to `false` if
     * we want to disable it.
     */
    keepAlive?: boolean;
    /**
     * Choose whether to use `worker_threads` or `child_process` for running the script.
     * The default setting is `worker_threads`.
     * 
     * In browser or Deno, this option is ignored and will always use the web worker.
     */
    adapter?: "worker_threads" | "child_process";
} = {}): AsyncFunctionProperties<M> {
    return new Proxy(Object.create(null), {
        get: (_, prop: string) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args: Parameters<M["_"]>) => {
                    let job: Awaited<ReturnType<typeof run>>;
                    let iter: AsyncIterator<unknown>;

                    return new ThenableAsyncGenerator({
                        async next() {
                            job ??= await run(mod, args, {
                                ...options,
                                fn: prop as "_",
                                keepAlive: options.keepAlive ?? true,
                            });

                            iter ??= job.iterate()[Symbol.asyncIterator]();
                            let { done = false, value } = await iter.next();

                            if (done) {
                                // HACK: this will set the internal result of ThenableAsyncGenerator
                                // to the result of the job.
                                value = await job.result();
                            }

                            return Promise.resolve({ done, value });
                        },
                        async then(onfulfilled, onrejected) {
                            job ??= await run(mod, args, {
                                ...options,
                                fn: prop as "_",
                            });
                            return job.result().then(onfulfilled, onrejected);
                        },
                    } satisfies ThenableAsyncGeneratorLike);
                }
            };

            return obj[prop];
        }
    }) as any;
}

export type AsyncFunctionProperties<T> = Readonly<Pick<T, AsyncFunctionPropertyNames<T>>>;
export type AsyncFunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => (Promise<any> | AsyncGenerator) ? K : never;
}[keyof T];
