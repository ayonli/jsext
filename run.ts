import type { Worker as NodeWorker } from "worker_threads";
import type { ChildProcess } from "child_process";
import { sequence } from "./number/index.ts";
import { isFunction } from "./try.ts";
import read from "./read.ts";

const isNode = typeof process === "object" && !!process.versions?.node;
declare var Deno: any;

/**
 * The maximum number of workers allowed to exist at the same time.
 * 
 * The primary purpose of the workers is not mean to run tasks in parallel, but run them in separate
 * from the main thread, so that aborting tasks can be achieved by terminating the worker thread and
 * it will not affect the main thread.
 * 
 * That said, the worker thread can still be used to achieve parallelism, but it should be noticed
 * that only the numbers of tasks that equals to the CPU core numbers will be run at the same time.
 */
const maxWorkerNum = 16;

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
 * Runs a task in the `script` in a worker thread that can be aborted during runtime.
 * 
 * In Node.js, the `script` can be either a CommonJS module or an ES module, and is relative to
 * the current working directory if not absolute.
 * 
 * In browser or Deno, the `script` can only be an ES module, and is relative to the current URL
 * (or working directory for Deno) if not absolute.
 * 
 * @example
 *  const job1 = await run("./job-example.mjs", ["World"]);
 *  console.log(await job1.result()); // Hello, World
 * 
 *  const job2 = await run<string, [string[]]>("./job-example.mjs", [["foo", "bar"]], {
 *      fn: "sequence",
 *  });
 *  for await (const word of job2.iterate()) {
 *      console.log(word);
 *      // Output:
 *      // foo
 *      // bar
 *  }
 * 
 *  const job3 = await run<string, [string]>("job-example.mjs", ["foobar"], {
 *     fn: "takeTooLong",
 *  });
 *  await job3.abort();
 *  const [err, res] = await jsext.try(job3.result());
 *  console.assert(err === null);
 *  console.assert(res === undefined);
 */
export default async function run<T, A extends any[] = any[]>(
    script: string,
    args: A | undefined = undefined,
    options: {
        /** If not set, runs the default function, otherwise runs the specific function. */
        fn?: string;
        /** Automatically abort the task when timeout (in milliseconds). */
        timeout?: number;
        /**
         * Instead of dropping the worker after the task has completed, keep it alive so that it can
         * be reused by other tasks.
         */
        keepAlive?: boolean;
        /**
         * Choose whether to use `worker_threads` or `child_process` fron running the script.
         * The default setting is `worker_threads`.
         * 
         * In browser or Deno, this option is ignored and will always use the web worker.
         */
        adapter?: "worker_threads" | "child_process";
        /**
         * In browser or Deno, by default, the program loads the worker entry directly from GitHub,
         * which could be slow due to poor internet connection, we can copy the entry file
         * `bundle/worker-web.mjs` to a local path of our website and set this option to that path
         * so that it can be loaded locally.
         * 
         * Or, if the code is bundled, the program won't be able to automatically locate the entry
         * file in the file system, in such case, we can also copy the entry file
         * (`bundle/worker-web.mjs` for the browser or Deno, `bundle/worker.mjs` for Node.js) to a
         * local directory and supply this option instead.
         */
        workerEntry?: string;
    } | undefined = undefined
): Promise<{
    workerId: number;
    /** Terminates the worker and abort the task. */
    abort(): Promise<void>;
    /** Retrieves the return value of the function. */
    result(): Promise<T>;
    /** Iterates the yield value if the function returns a generator. */
    iterate(): AsyncIterable<T>;
}> {
    const msg = {
        type: "ffi",
        script,
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

    // `buffer` is used to store data pieces yielded by generator functions before they are
    // consumed. `error` and `result` serves similar purposes for function results.
    const buffer: any[] = [];
    let error: Error | null = null;
    let result: { value: any; } | undefined;
    let resolver: {
        resolve: (data: any) => void;
        reject: (err: unknown) => void;
    } | undefined;
    let iterator: EventTarget | NodeJS.EventEmitter | undefined;
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
            } else if (msg.type === "yield") {
                if (msg.done) {
                    // The final message of yield event is the return value.
                    handleMessage({ type: "return", value: msg.value });
                } else {
                    if (iterator) {
                        if (isFunction((iterator as EventTarget).dispatchEvent)) {
                            (iterator as EventTarget).dispatchEvent(
                                new MessageEvent("message", { data: msg.value })
                            );
                        } else {
                            (iterator as NodeJS.EventEmitter).emit("data", msg.value);
                        }
                    } else {
                        buffer.push(msg.value);
                    }
                }
            }
        }
    };

    const handleError = (err: Error | null) => {
        if (resolver) {
            resolver.reject(err);
        } else if (iterator) {
            if (isFunction((iterator as EventTarget).dispatchEvent)) {
                (iterator as EventTarget).dispatchEvent(
                    new MessageEvent("error", { data: err })
                );
            } else {
                (iterator as NodeJS.EventEmitter).emit("error", err);
            }
        } else {
            error = err;
        }
    };
    const handleExit = () => {
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
        } else if (iterator) {
            if (isFunction((iterator as EventTarget).dispatchEvent)) {
                (iterator as EventTarget).dispatchEvent(new MessageEvent("close"));
            } else {
                (iterator as NodeJS.EventEmitter).emit("close");
            }
        } else if (!error && !result) {
            result = { value: void 0 };
        }
    };

    if (isNode) {
        let entry = options?.workerEntry;

        if (!entry) {
            const path = await import("path");
            const { fileURLToPath } = await import("url");
            const dirname = path.dirname(fileURLToPath(import.meta.url));

            if (["cjs", "esm"].includes(path.basename(dirname))) { // compiled
                entry = path.join(path.dirname(dirname), "bundle", "worker.mjs");
            } else {
                entry = path.join(dirname, "worker.mjs");
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
            } else if (workerPool.length < maxWorkerNum) {
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
                // maxWorkerNum. If the the call doesn't keep-alive the worker, it will be
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
                }).then(() => run(script, args, options));
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
            } else if (workerPool.length < maxWorkerNum) {
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
                }).then(() => run(script, args, options));
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
        } else if (workerPool.length < maxWorkerNum) {
            let url: string;

            if (typeof Deno === "object") {
                // Deno can load the module regardless of MINE type.
                url = [
                    ...(import.meta.url.split("/").slice(0, -1)),
                    "worker-web.mjs"
                ].join("/");
            } else {
                const _url = options?.workerEntry
                    || "https://raw.githubusercontent.com/ayonli/jsext/main/bundle/worker-web.mjs";
                const res = await fetch(_url);
                let blob: Blob;

                if (res.headers.get("content-type")?.startsWith("application/javascript")) {
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
            }).then(() => run(script, args, options));
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
        async *iterate() {
            if (resolver) {
                throw new Error("result() has been called");
            } else if (result) {
                throw new TypeError("the response is not iterable");
            }

            if (typeof MessageEvent === "function" && typeof EventTarget === "function") {
                iterator = new EventTarget();

                if (buffer.length) {
                    (async () => {
                        await Promise.resolve(null);
                        let msg: any;

                        while (msg = buffer.shift()) {
                            iterator.dispatchEvent(new MessageEvent("message", { data: msg }));
                        }
                    })().catch(console.error);
                }

                for await (const msg of read<any>(iterator)) {
                    yield msg;
                }
            } else {
                const { EventEmitter } = await import("events");
                iterator = new EventEmitter();

                if (buffer.length) {
                    (async () => {
                        await Promise.resolve(null);
                        let msg: any;

                        while (msg = buffer.shift()) {
                            iterator.emit("data", msg);
                        }
                    })().catch(console.error);
                }

                for await (const msg of read<any>(iterator)) {
                    yield msg;
                }
            }
        },
    };
}
