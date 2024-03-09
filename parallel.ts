/**
 * This module provides JavaScript the ability to run functions in parallel
 * threads and take advantage of multi-core CPUs, inspired by Golang.
 * @module
 */

import type { Worker as NodeWorker } from "node:worker_threads";
import type { ChildProcess } from "node:child_process";
import { ThenableAsyncGenerator, ThenableAsyncGeneratorLike } from "./external/thenable-generator/index.ts";
import chan, { Channel } from "./chan.ts";
import { sequence } from "./number/index.ts";
import { trim } from "./string/index.ts";
import { isPlainObject } from "./object/index.ts";
import {
    Exception,
    fromErrorEvent,
    fromObject,
    isAggregateError,
    isDOMException,
    toObject
} from "./error/index.ts";
import {
    isBun,
    isDeno,
    isNodePrior14,
    isNode,
    IsPath,
    isMainThread,
    resolveModule,
    ChannelMessage,
    isChannelMessage,
    handleChannelMessage,
    wrapChannel
} from "./util.ts";

export interface BunWorker extends Worker {
    ref(): void;
    unref(): void;
}

export type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
export type FunctionProperties<T> = Readonly<Pick<T, FunctionPropertyNames<T>>>;
export type ThreadedFunctions<M, T extends FunctionProperties<M> = FunctionProperties<M>> = {
    [K in keyof T]: T[K] extends (...args: infer A) => AsyncGenerator<infer T, infer R, infer N> ? (...args: A) => AsyncGenerator<T, R, N>
    : T[K] extends (...args: infer A) => Generator<infer T, infer R, infer N> ? (...args: A) => AsyncGenerator<T, R, N>
    : T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>>
    : T[K];
};

const taskIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
type RemoteTask = {
    module: string;
    fn: string;
    error?: unknown;
    result?: { value: any; };
    resolver?: {
        resolve: (data: any) => void;
        reject: (err: unknown) => void;
    };
    channel?: Channel<IteratorResult<any>>;
    generate?: () => void;
};
const remoteTasks = new Map<number, RemoteTask>;

const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
type PoolRecord = {
    getWorker: Promise<Worker | BunWorker | NodeWorker>;
    tasks: Set<number>;
    lastAccess: number;
};
let workerPool: PoolRecord[] = [];
let gcTimer: number | NodeJS.Timeout;
declare var Deno: any;

export const getMaxParallelism: Promise<number> = (async () => {
    if (isNode) {
        const os = await import("os");

        if (typeof os.availableParallelism === "function") {
            return os.availableParallelism();
        } else {
            return os.cpus().length;
        }
    } else if (typeof navigator === "object" && navigator.hardwareConcurrency) {
        return navigator.hardwareConcurrency;
    } else {
        return 8;
    }
})();

export function sanitizeModuleId(id: string | (() => Promise<any>), strict = false): string {
    let _id = "";

    if (typeof id === "function") {
        let str = id.toString();
        let offset = "import(".length;
        let start = str.lastIndexOf("import(");

        if (start === -1) {
            offset = "require(".length;
            start = str.lastIndexOf("require(");
        }

        if (start === -1) {
            throw new TypeError("the given script is not a dynamic import expression");
        } else {
            start += offset;
            const end = str.indexOf(")", start);
            _id = trim(str.slice(start, end), ` '"\'`);
        }
    } else {
        _id = id;
    }

    if ((isNode || isBun) && IsPath.test(_id)) {
        if (!/\.[cm]?(js|ts|)x?$/.test(_id)) { // if omitted suffix, add suffix
            _id += isBun ? ".ts" : ".js";
        } else if (isNode) { // replace .ts/.mts/.cts to .js/.mjs/.cjs in Node.js
            if (_id.endsWith(".ts")) {
                _id = _id.slice(0, -3) + ".js";
            } else if (_id.endsWith(".mts")) {
                _id = _id.slice(0, -4) + ".mjs";
            } else if (_id.endsWith(".cts")) { // rare, but should support
                _id = _id.slice(0, -4) + ".cjs";
            } else if (_id.endsWith(".tsx")) { // rare, but should support
                _id = _id.slice(0, -4) + ".js";
            }
        }
    }

    if (!IsPath.test(_id) && !strict) {
        _id = "./" + _id;
    }

    return _id;
}

export type CallRequest = {
    type: "call";
    module: string;
    fn: string;
    args: any[];
    taskId?: number | undefined;
} | {
    type: | "next" | "return" | "throw";
    args: any[];
    taskId: number;
};

export type CallResponse = {
    type: "return" | "yield" | "error" | "gen";
    taskId?: number | undefined;
    value?: any;
    error?: unknown;
    done?: boolean | undefined;
};

export function isCallResponse(msg: any): msg is CallResponse {
    return msg
        && typeof msg === "object"
        && ["return", "yield", "error", "gen"].includes(msg.type);
}

export async function createWorker(options: {
    adapter?: "worker_threads" | "child_process";
} = {}): Promise<{
    worker: Worker | BunWorker | NodeWorker | ChildProcess;
    workerId: number;
    kind: "web_worker" | "bun_worker" | "node_worker" | "node_process";
}> {
    let { adapter = "worker_threads" } = options;
    let entry = parallel.workerEntry;

    if (isNode || isBun) {
        if (!entry) {
            const path = await import("path");
            const { fileURLToPath } = await import("url");
            const _filename = fileURLToPath(import.meta.url);

            if (_filename === process.argv[1]) {
                // The code is bundled, try the worker entry in node_modules
                // (hope it exists).
                if (isBun) {
                    if (_filename.endsWith(".ts")) {
                        entry = "./node_modules/@ayonli/jsext/worker.ts";
                    } else {
                        entry = "./node_modules/@ayonli/jsext/bundle/worker.mjs";
                    }
                } else {
                    entry = "./node_modules/@ayonli/jsext/bundle/worker-node.mjs";
                }
            } else {
                let _dirname = path.dirname(_filename);

                if ([
                    path.join("jsext", "cjs"),
                    path.join("jsext", "esm"),
                    path.join("jsext", "bundle")
                ].some(path => _dirname.endsWith(path))) {
                    // The application imports the compiled version of this
                    // module, redirect to the root directory of this package.
                    _dirname = path.dirname(_dirname);
                }

                if (isBun) {
                    if (_filename.endsWith(".ts")) {
                        entry = path.join(_dirname, "worker.ts");
                    } else {
                        entry = path.join(_dirname, "bundle", "worker.mjs");
                    }
                } else {
                    entry = path.join(_dirname, "bundle", "worker-node.mjs");
                }
            }
        }

        if (adapter === "child_process") {
            const { fork } = await import("child_process");
            const serialization = isNodePrior14 ? "json" : "advanced";
            const worker = fork(entry, ["--worker-thread"], {
                stdio: "inherit",
                serialization,
            });
            const workerId = worker.pid as number;

            await new Promise<void>((resolve, reject) => {
                worker.once("error", reject);
                worker.once("message", () => {
                    worker.off("error", reject);
                    resolve();
                });
            });

            return {
                worker,
                workerId,
                kind: "node_process",
            };
        } else if (isNode) {
            const { Worker } = await import("worker_threads");
            const worker = new Worker(entry, { argv: ["--worker-thread"] });
            const workerId = worker.threadId;

            await new Promise<void>((resolve, reject) => {
                worker.once("error", reject);
                worker.once("online", () => {
                    worker.off("error", reject);
                    resolve();
                });
            });

            return {
                worker,
                workerId,
                kind: "node_worker",
            };
        } else { // isBun
            const worker = new Worker(entry, { type: "module" });
            const workerId = workerIdCounter.next().value as number;

            await new Promise<void>((resolve, reject) => {
                worker.onerror = (ev) => {
                    reject(new Error(ev.message || "unable to start the worker"));
                };
                worker.addEventListener("open", () => {
                    worker.onerror = null;
                    resolve();
                });
            });

            return {
                worker,
                workerId,
                kind: "bun_worker",
            };
        }
    } else { // Deno and browsers
        if (isDeno) {
            if (!entry) {
                if ((import.meta as any)["main"]) {
                    // The code is bundled, try the remote worker entry.
                    if (import.meta.url.includes("jsr.io")) {
                        entry = "jsr:@ayonli/jsext/worker.ts";
                    } else {
                        entry = "https://ayonli.github.io/jsext/bundle/worker.mjs";
                    }
                } else {
                    if (import.meta.url.includes("jsr.io")) {
                        entry = "jsr:@ayonli/jsext/worker.ts";
                    } else {
                        entry = [
                            ...(import.meta.url.split("/").slice(0, -1)),
                            "worker.ts"
                        ].join("/");
                    }

                    // The application imports the compiled version of this
                    // module, redirect to the source worker entry.
                    if (entry.endsWith("/esm/worker.ts")) {
                        entry = entry.slice(0, -14) + "/worker.ts";
                    }
                }
            }
        } else {
            // Use fetch to download the script and compose an object URL can
            // bypass CORS security constraint in the browser.
            const url = entry || "https://ayonli.github.io/jsext/bundle/worker.mjs";
            const res = await fetch(url);
            let blob: Blob;

            if (res.headers.get("content-type")?.includes("/javascript")) {
                blob = await res.blob();
            } else {
                const buf = await res.arrayBuffer();
                blob = new Blob([new Uint8Array(buf)], {
                    type: "application/javascript",
                });
            }

            entry = URL.createObjectURL(blob);
        }

        const worker = new Worker(entry, { type: "module" });
        const workerId = workerIdCounter.next().value as number;

        return {
            worker,
            workerId,
            kind: "web_worker",
        };
    }
}

async function acquireWorker(taskId: number) {
    const maxWorkers = parallel.maxWorkers || await getMaxParallelism;
    let poolRecord = workerPool.find(item => !item.tasks.size) as PoolRecord;

    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
    } else if (workerPool.length < maxWorkers) {
        workerPool.push(poolRecord = {
            getWorker: (async () => {
                const worker = (await createWorker()).worker as Worker | BunWorker | NodeWorker;
                const handleMessage = (msg: any) => {
                    if (isChannelMessage(msg)) {
                        handleChannelMessage(msg);
                    } else if (isCallResponse(msg) && msg.taskId) {
                        const task = remoteTasks.get(msg.taskId);

                        if (!task)
                            return;

                        if (msg.type === "return" || msg.type === "error") {
                            if (msg.type === "error") {
                                const err = isPlainObject(msg.error)
                                    ? (fromObject(msg.error) ?? msg.error)
                                    : msg.error;

                                if (err instanceof Error &&
                                    (err.message.includes("not be cloned")
                                        || err.stack?.includes("not be cloned") // Node.js v16-
                                    )
                                ) {
                                    Object.defineProperty(err, "stack", {
                                        configurable: true,
                                        enumerable: false,
                                        writable: true,
                                        value: (err.stack ? err.stack + "\n    " : "")
                                            + `at ${task.fn} (${task.module})`,
                                    });
                                }

                                if (task.resolver) {
                                    task.resolver.reject(err);

                                    if (task.channel) {
                                        task.channel.close();
                                    }
                                } else if (task.channel) {
                                    task.channel.close(err as Error);
                                } else {
                                    task.error = err;
                                }
                            } else {
                                const value = unwrapReturnValue(msg.value);

                                if (task.resolver) {
                                    task.resolver.resolve(value);
                                } else {
                                    task.result = { value };
                                }

                                if (task.channel) {
                                    task.channel.close();
                                }
                            }

                            poolRecord.tasks.delete(msg.taskId);

                            if (!poolRecord.tasks.size && (isNode || isBun)) {
                                // Allow the main thread to exit if the event
                                // loop is empty.
                                (worker as NodeWorker | BunWorker).unref();
                            }
                        } else if (msg.type === "yield") {
                            const value = unwrapReturnValue(msg.value);
                            task.channel?.send({ value, done: msg.done as boolean });

                            if (msg.done) {
                                // The final message of yield event is the
                                // return value.
                                handleMessage({
                                    type: "return",
                                    value,
                                    taskId: msg.taskId,
                                } satisfies CallResponse);
                            }
                        } else if (msg.type === "gen") {
                            task.generate?.();
                        }
                    }
                };

                const handleClose = (err: Error) => {
                    for (const taskId of poolRecord.tasks) {
                        poolRecord.tasks.delete(taskId);
                        const task = remoteTasks.get(taskId);

                        if (task) {
                            if (task.resolver) {
                                task.resolver.reject(err);

                                if (task.channel) {
                                    task.channel.close();
                                }
                            } else if (task.channel) {
                                task.channel.close(err);
                            } else {
                                task.error = err;
                            }
                        }
                    }

                    workerPool = workerPool.filter(item => item !== poolRecord);
                };

                if (isNode) {
                    (worker as NodeWorker).on("message", handleMessage)
                        .on("error", handleClose); // In Node.js, worker will exit once erred.
                } else if (isBun) {
                    const _worker = worker as BunWorker;

                    _worker.onmessage = (ev) => handleMessage(ev.data);
                    _worker.onerror = () => _worker.terminate(); // terminate once erred
                    _worker.addEventListener("close", ((ev: CloseEvent) => {
                        handleClose(new Error(ev.reason + " (" + ev.code + ")"));
                    }) as EventListener);
                } else {
                    const _worker = worker as Worker;

                    _worker.onmessage = (ev) => handleMessage(ev.data);
                    _worker.onerror = (ev) => {
                        _worker.terminate(); // ensure termination
                        handleClose(fromErrorEvent(ev) ?? new Error("worker exited"));
                    };
                }

                return worker;
            })(),
            tasks: new Set(),
            lastAccess: Date.now(),
        });

        if (!gcTimer) {
            gcTimer = setInterval(() => {
                // GC: clean long-time unused workers
                const now = Date.now();
                const idealItems: PoolRecord[] = [];

                workerPool = workerPool.filter(item => {
                    const ideal = !item.tasks.size
                        && (now - item.lastAccess) >= 10_000;

                    if (ideal) {
                        idealItems.push(item);
                    }

                    return !ideal;
                });

                idealItems.forEach(async item => {
                    const worker = await item.getWorker;
                    await (worker as Worker | BunWorker | NodeWorker).terminate();
                });
            }, 1_000);

            if (isNode || isBun) {
                (gcTimer as NodeJS.Timeout).unref();
            } else if (isDeno) {
                Deno.unrefTimer(gcTimer);
            }
        }
    } else {
        poolRecord = workerPool[taskId % workerPool.length] as PoolRecord;
        poolRecord.lastAccess = Date.now();
    }

    poolRecord.tasks.add(taskId);

    const worker = await poolRecord.getWorker;

    if (isNode || isBun) {
        // Prevent premature exit in the main thread.
        (worker as NodeWorker | BunWorker).ref();
    }

    return worker;
}

export function wrapArgs<A extends any[]>(
    args: A,
    getWorker: Promise<Worker | BunWorker | NodeWorker | ChildProcess>
): {
    args: A,
    transferable: ArrayBuffer[];
} {
    const transferable: ArrayBuffer[] = [];
    args = args.map(arg => {
        if (arg instanceof Channel) {
            return wrapChannel(arg, (type, msg, channelId) => {
                getWorker.then(worker => {
                    if (typeof (worker as any)["postMessage"] === "function") {
                        try {
                            (worker as Worker).postMessage({
                                type,
                                value: msg,
                                channelId,
                            } satisfies ChannelMessage);
                        } catch (err) {
                            // Suppress error when sending `close` command to
                            // the channel in the worker thread when the thread
                            // is terminated. This situation often occurs when
                            // using `run()` to call function and the `result()`
                            // is called before `channel.close()`.
                            if (!(type === "close" &&
                                String(err).includes("Worker has been terminated"))
                            ) {
                                throw err;
                            }
                        }
                    } else {
                        (worker as ChildProcess).send({
                            type,
                            value: msg,
                            channelId,
                        } satisfies ChannelMessage);
                    }
                });
            });
        } else if ((arg instanceof Exception)
            || isDOMException(arg)
            || isAggregateError(arg)
        ) {
            return toObject(arg);
        }

        if (arg instanceof ArrayBuffer) {
            transferable.push(arg);
        } else if (isPlainObject(arg)) {
            for (const key of Object.getOwnPropertyNames(arg)) {
                const value = arg[key];

                if (value instanceof ArrayBuffer) {
                    transferable.push(value);
                } else if ((value instanceof Exception)
                    || isDOMException(value)
                    || isAggregateError(value)
                ) {
                    arg[key] = toObject(value);
                }
            }
        } else if (Array.isArray(arg)) {
            arg = arg.map(item => {
                if (item instanceof ArrayBuffer) {
                    transferable.push(item);
                    return item;
                } else if ((item instanceof Exception)
                    || isDOMException(item)
                    || isAggregateError(item)
                ) {
                    return toObject(item);
                } else {
                    return item;
                }
            });
        }

        return arg;
    }) as A;

    return { args, transferable };
}

export function unwrapReturnValue(value: any): any {
    if (isPlainObject(value) && (
        value["@@type"] === "Exception" ||
        value["@@type"] === "DOMException" ||
        value["@@type"] === "AggregateError"
    )) {
        return fromObject(value);
    }

    return value;
}

async function safeRemoteCall(
    worker: Worker | BunWorker | NodeWorker,
    req: CallRequest,
    transferable: ArrayBuffer[],
    taskId: number
) {
    try {
        (worker as Worker).postMessage(req, transferable);
    } catch (err) {
        remoteTasks.delete(taskId);

        if (typeof (worker as any)["unref"] === "function") {
            (worker as BunWorker | NodeWorker).unref();
        }

        throw err;
    }
}

function createRemoteCall(module: string, fn: string, args: any[]) {
    const taskId = taskIdCounter.next().value as number;
    remoteTasks.set(taskId, { module, fn });

    let getWorker = acquireWorker(taskId);
    const { args: _args, transferable } = wrapArgs(args, getWorker);

    getWorker = getWorker.then(async (worker) => {
        await safeRemoteCall(worker, {
            type: "call",
            module,
            fn,
            args: _args,
            taskId,
        }, transferable, taskId);

        return worker;
    });

    return new ThenableAsyncGenerator({
        then(onfulfilled, onrejected) {
            const task = remoteTasks.get(taskId) as RemoteTask;

            if (task.error) {
                remoteTasks.delete(taskId);
                return onrejected?.(task.error);
            } else if (task.result) {
                remoteTasks.delete(taskId);
                return onfulfilled?.(task.result.value);
            } else {
                return getWorker.then(() => new Promise((resolve, reject) => {
                    task.resolver = {
                        resolve: (value) => {
                            remoteTasks.delete(taskId);
                            resolve(value);
                        },
                        reject: (err) => {
                            remoteTasks.delete(taskId);
                            reject(err);
                        }
                    };
                })).then(onfulfilled, onrejected);
            }
        },
        async next(input) {
            const task = remoteTasks.get(taskId) as RemoteTask;

            if (task.error) {
                const err = task.error;
                remoteTasks.delete(taskId);
                throw err;
            } else if (task.result) {
                const value = task.result.value;
                remoteTasks.delete(taskId);
                return { value, done: true };
            } else {
                task.channel ??= chan(Infinity);
                const worker = await getWorker;

                if (!task.generate) {
                    await new Promise<void>(resolve => {
                        task.generate = resolve;
                    });
                }

                const { args, transferable } = wrapArgs([input], getWorker);

                await safeRemoteCall(worker, {
                    type: "next",
                    args: args,
                    taskId,
                }, transferable, taskId);

                return await task.channel.recv();
            }
        },
        async return(value) {
            remoteTasks.delete(taskId);
            const worker = await getWorker;
            const { args, transferable } = wrapArgs([value], getWorker);

            await safeRemoteCall(worker, {
                type: "return",
                args: args,
                taskId,
            }, transferable, taskId);

            return { value, done: true };
        },
        async throw(err) {
            remoteTasks.delete(taskId);
            const worker = await getWorker;

            await safeRemoteCall(worker, {
                type: "throw",
                args: [err],
                taskId,
            }, transferable, taskId);

            throw err;
        },
    } as ThenableAsyncGeneratorLike);
}

function createLocalCall(module: string, fn: string, args: any[]) {
    const getReturns = resolveModule(module).then(mod => {
        return mod[fn](...args);
    });

    return new ThenableAsyncGenerator({
        then(onfulfilled, onrejected) {
            return getReturns.then(onfulfilled, onrejected);
        },
        async next(input) {
            const gen: Generator | AsyncGenerator = await getReturns;
            return await gen.next(input);
        },
        async return(value) {
            const gen: Generator | AsyncGenerator = await getReturns;
            return await gen.return(value);
        },
        async throw(err) {
            const gen: Generator | AsyncGenerator = await getReturns;
            return gen.throw(err);
        },
    } as ThenableAsyncGeneratorLike);
}

function extractBaseUrl(stackTrace: string): string | undefined {
    let lines = stackTrace.split("\n");
    const offset = lines.findIndex(line => line === "Error");

    if (offset !== -1) {
        lines = lines.slice(offset); // fix for tsx in Node.js v16
    }

    let callSite: string;

    if (lines[0]?.startsWith("Error")) { // chromium browsers
        callSite = lines[2] as string;
    } else {
        callSite = lines[1] as string;
    }

    let baseUrl: string | undefined;

    if (callSite) {
        let start = callSite.lastIndexOf("(");
        let end = 0;

        if (start !== -1) {
            start += 1;
            end = callSite.indexOf(")", start);
            callSite = callSite.slice(start, end);
        } else if (callSite.startsWith("    at ")) {
            callSite = callSite.slice(7); // remove leading `    at `
        } else if (typeof location === "object") { // general browsers
            start = callSite.match(/(https?|file):/)?.index ?? -1;

            if (start > 0) {
                callSite = callSite.slice(start);
            }
        }

        baseUrl = callSite.replace(/:\d+:\d+$/, "");

        if (!/^(https?|file):/.test(baseUrl)) {
            if (IsPath.test(baseUrl)) {
                baseUrl = "file://" + baseUrl;
            } else if (isDeno) {
                baseUrl = "file://" + Deno.cwd() + "/";
            } else if (isNode || isBun) {
                baseUrl = "file://" + process.cwd() + "/";
            } else if (typeof location === "object") {
                baseUrl = location.href;
            } else {
                baseUrl = "";
            }
        }
    }

    return baseUrl;
}

/**
 * Wraps a module so its functions will be run in worker threads.
 * 
 * In Node.js and Bun, the `module` can be either an ES module or a CommonJS
 * module, **node_modules** and built-in modules are also supported.
 * 
 * In browsers and Deno, the `module` can only be an ES module.
 * 
 * Data are cloned and transferred between threads via **Structured Clone**
 * **Algorithm**.
 * 
 * Apart from the standard data types supported by the algorithm, {@link Channel}
 * can also be used to transfer data between threads. To do so, just passed a
 * channel instance to the threaded function. But be aware, channel can only be
 * used as a parameter, return a channel from the threaded function is not
 * allowed. Once passed, the data can only be transferred into and out-from the
 * function.
 * 
 * The difference between using a channel and a generator function for streaming
 * processing is, for a generator function, `next(value)` is coupled with a
 * `yield value`, the process is blocked between **next** calls, channel doesn't
 * have this limit, we can use it to stream all the data into the function
 * before processing and receiving any result.
 * 
 * The threaded function also supports `ArrayBuffer`s as transferable objects.
 * If an array buffer is presented as an argument or the direct property of an
 * argument (assume it's a plain object), or the array buffer is the return
 * value or the direct property of the return value (assume it's a plain object),
 * it automatically becomes a transferrable object and will be transferred to
 * the other thread instead of being cloned. This strategy allows us to easily
 * compose objects like `Request` and `Response` instances into plain objects
 * and pass them between threads without overhead.
 * 
 * @remarks
 * If the current module is already in a worker thread, use this function won't
 * create another worker thread.
 * 
 * @remarks
 * Cloning and transferring data between the main thread and worker threads are
 * very heavy and slow, worker threads are only intended to run CPU-intensive
 * tasks or divide tasks among multiple threads, they have no advantage when
 * performing IO-intensive tasks such as handling HTTP requests, always prefer
 * `cluster` module for that kind of purpose.
 * 
 * @remarks
 * For error instances, only the following types are guaranteed to be sent and
 * received properly between threads.
 * 
 * - `Error`
 * - `EvalError`
 * - `RangeError`
 * - `ReferenceError`
 * - `SyntaxError`
 * - `TypeError`
 * - `URIError`
 * - `AggregateError` (as arguments, return values, thrown values, or shallow
 *   object properties)
 * - `Exception` (as arguments, return values, thrown values, or shallow object
 *   properties)
 * - `DOMException` (as arguments, return values, thrown values, or shallow
 *   object properties)
 * 
 * In order to handle errors properly between threads, throw well-known error
 * types or use `Exception` (or `DOMException`) with error names in the threaded
 * function.
 * 
 * @example
 * ```ts
 * // regular or async function
 * import parallel from "@ayonli/jsext/parallel";
 * 
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 * 
 * @example
 * ```ts
 * // generator or async generator function
 * import parallel from "@ayonli/jsext/parallel";
 * 
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * 
 * for await (const word of mod.sequence(["foo", "bar"])) {
 *     console.log(word);
 * }
 * // output:
 * // foo
 * // bar
 * ```
 * 
 * @example
 * ```ts
 * // use channel
 * import parallel from "@ayonli/jsext/parallel";
 * import chan from "@ayonli/jsext/chan";
 * import { sequence } from "@ayonli/jsext/number";
 * import { readAll } from "@ayonli/jsext/read";
 * 
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * 
 * const channel = chan<{ value: number; done: boolean; }>();
 * const length = mod.twoTimesValues(channel);
 * 
 * for (const value of sequence(0, 9)) {
 *     await channel.push({ value, done: value === 9 });
 * }
 * 
 * const results = (await readAll(channel)).map(item => item.value);
 * console.log(results);      // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
 * console.log(await length); // 10
 * ```
 * 
 * @example
 * ```ts
 * import parallel from "@ayonli/jsext/parallel";
 * 
 * // use transferrable
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * 
 * const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const length = await mod.transfer(arr.buffer);
 * 
 * console.log(length);     // 10
 * console.log(arr.length); // 0
 * ```
 * 
 * @remarks
 * If the application is to be bundled, use the following syntax to link the
 * module instead, it will prevent the bundler from including the file and
 * rewriting the path.
 * 
 * ```ts
 * const mod = parallel<typeof import("./examples/worker.mjs")>("./examples/worker.mjs");
 * ```
 */
function parallel<M extends { [x: string]: any; }>(
    module: string | (() => Promise<M>)
): ThreadedFunctions<M> {
    let modId = sanitizeModuleId(module, true);
    let baseUrl: string | undefined;

    if (IsPath.test(modId)) {
        if (typeof Error.captureStackTrace === "function") {
            const trace: { stack?: string; } = {};
            Error.captureStackTrace(trace);
            baseUrl = extractBaseUrl(trace.stack as string);
        } else {
            const trace = new Error("");
            baseUrl = extractBaseUrl(trace.stack as string);
        }
    }

    if (baseUrl) {
        modId = new URL(modId, baseUrl).href;
    }

    return new Proxy(Object.create(null), {
        get: (target, prop: string | symbol) => {
            if (Reflect.has(target, prop)) {
                return target[prop];
            } else if (typeof prop === "symbol") {
                return undefined;
            }

            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args: Parameters<M["_"]>) => {
                    if (isMainThread) {
                        return createRemoteCall(modId, prop, args);
                    } else {
                        return createLocalCall(modId, prop, args);
                    }
                }
            };

            return obj[prop];
        }
    }) as any;
}

namespace parallel {
    /**
     * The maximum number of workers allowed to exist at the same time. If not
     * set, the program by default uses CPU core numbers as the limit.
     */
    export var maxWorkers: number | undefined = undefined;

    /**
     * In browsers, by default, the program loads the worker entry directly from
     * GitHub, which could be slow due to poor internet connection, we can copy
     * the entry file `bundle/worker.mjs` to a local path of our website and set
     * this option to that path so that it can be loaded locally.
     * 
     * Or, if the code is bundled, the program won't be able to automatically
     * locate the entry file in the file system, in such case, we can also copy
     * the entry file (`bundle/worker.mjs` for Bun, Deno and the browser,
     * `bundle/worker-node.mjs` for Node.js) to a local directory and supply
     * this option instead.
     */
    export var workerEntry: string | undefined = undefined;
}

export default parallel;
