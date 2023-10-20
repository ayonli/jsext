import type { Worker as NodeWorker } from "node:worker_threads";
import type { ChildProcess } from "node:child_process";
import { ThenableAsyncGenerator, ThenableAsyncGeneratorLike } from "./external/thenable-generator/index.ts";
import chan, { Channel } from "./chan.ts";
import { sequence } from "./number/index.ts";
import { trim } from "./string/index.ts";
import { fromObject } from "./error/index.ts";
import type { Optional } from "./index.ts";
import {
    isNode,
    isDeno,
    isBun,
    isBeforeNode14,
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

/**
 * The `[terminate]()` function of the threaded module should only be used for
 * testing purposes. When using `child_process` adapter, the program will not be able exit
 * automatically after the test because there is an active IPC channel between the parent and
 * the child process. Calling the terminate function will force to kill the child process and
 * allow the program to exit.
 */
export const terminate = Symbol.for("terminate");

const shouldTransfer = Symbol.for("shouldTransfer");
const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
declare var Deno: any;
declare var Bun: any;
declare var WorkerGlobalScope: object;

// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker. In Bun, this option only presents when using `child_process` adapter.
const isWorkerThread = (isNode || isBun) && process.argv.includes("--worker-thread");
const isMainThread = !isWorkerThread
    && (isBun ? (Bun.isMainThread as boolean) : typeof WorkerGlobalScope === "undefined");

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
const tasks = new Map<number, RemoteTask>;

const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
type PoolRecord = {
    getWorker: Promise<Worker | BunWorker | NodeWorker | ChildProcess>;
    adapter: "worker_threads" | "child_process";
    serialization: "advanced" | "json";
    tasks: Set<number>;
    lastAccess: number;
};
const workerPools = new Map<string, PoolRecord[]>();

export const getMaxParallelism = (async () => {
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
        let start = str.lastIndexOf("(");

        if (start === -1) {
            throw new TypeError("the given script is not a dynamic import expression");
        } else {
            start += 1;
            const end = str.indexOf(")", start);
            _id = trim(str.slice(start, end), ` '"\'`);
        }
    } else {
        _id = id;
    }

    if (isNode &&
        !/\.[cm]?(js|ts|)x?$/.test(_id) && // omit suffix
        IsPath.test(_id)                   // relative or absolute path
    ) {
        if (isBun) {
            _id += ".ts";
        } else {
            _id += ".js";
        }
    }

    if (!IsPath.test(_id) && !strict) {
        _id = "./" + _id;
    }

    return _id;
}

export type CallRequest = {
    type: "call" | "next" | "return" | "throw";
    script: string;
    baseUrl: string;
    fn: string;
    args: any[];
    taskId?: number | undefined;
};

export function createCallRequest(init: Optional<CallRequest, "type" | "baseUrl">): CallRequest {
    const msg = { ...init, type: init.type || "call" } as CallRequest;

    if (!msg.baseUrl) {
        if (isDeno) {
            msg.baseUrl = "file://" + Deno.cwd() + "/";
        } else if (isNode || isBun) {
            if (IsPath.test(msg.script)) {
                // Only set baseUrl for relative modules, don't set it for node modules.
                msg.baseUrl = "file://" + process.cwd() + "/";
            }
        } else if (typeof location === "object") {
            msg.baseUrl = location.href;
        }
    }

    return msg;
}

export type CallResponse = {
    type: "return" | "yield" | "error" | "gen";
    taskId?: number | undefined;
    value?: any;
    error?: unknown;
    done?: boolean | undefined;
};

export function isCallResponse(msg: any): msg is CallResponse {
    return msg && typeof msg === "object" && ["return", "yield", "error", "gen"].includes(msg.type);
}

export async function createWorker(options: {
    entry?: string | undefined;
    adapter: "worker_threads" | "child_process";
    serialization: "advanced" | "json";
}): Promise<{
    worker: Worker | BunWorker | NodeWorker | ChildProcess;
    workerId: number;
    kind: "web_worker" | "bun_worker" | "node_worker" | "node_process";
}> {
    let { entry, adapter, serialization } = options;

    if (isNode || isBun) {
        if (!entry) {
            const path = await import("path");
            const { fileURLToPath } = await import("url");
            const _filename = fileURLToPath(import.meta.url);

            if (_filename === process.argv[1]) {
                // The code is bundled, try the worker entry in node_modules (hope it exists).
                if (isBun) {
                    entry = "./node_modules/@ayonli/jsext/worker.ts";
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
                    // The application imports the compiled version of this module,
                    // redirect to the root directory of this package.
                    _dirname = path.dirname(_dirname);
                }

                if (isBun) {
                    entry = path.join(_dirname, "worker.ts");
                } else {
                    entry = path.join(_dirname, "bundle", "worker-node.mjs");
                }
            }
        }

        if (adapter === "child_process") {
            const { fork } = await import("child_process");

            const worker = fork(entry, ["--worker-thread", "--serialization=" + serialization], {
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
                    entry = "https://ayonli.github.io/jsext/bundle/worker.mjs";
                } else {
                    entry = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker.ts"
                    ].join("/");

                    // The application imports the compiled version of this module,
                    // redirect to the source worker entry.
                    if (entry.endsWith("/esm/worker.ts")) {
                        entry = entry.slice(0, -14) + "/worker.ts";
                    }
                }
            }
        } else {
            // Use fetch to download the script and compose an object URL can bypass CORS
            // security constraint in the browser.
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

async function acquireWorker(taskId: number, options: {
    adapter: "worker_threads" | "child_process";
    serialization: "advanced" | "json";
}) {
    const maxWorkers = parallel.maxWorkers || await getMaxParallelism;
    const { adapter, serialization } = options;
    const poolKey = adapter + ":" + serialization;
    const workerPool = workerPools.get(poolKey)
        ?? (workerPools.set(poolKey, []).get(poolKey) as PoolRecord[]);
    let poolRecord = workerPool.find(item => !item.tasks.size);

    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
    } else if (workerPool.length < maxWorkers) {
        workerPool.push(poolRecord = {
            getWorker: (async () => {
                const { worker } = await createWorker({
                    entry: parallel.workerEntry,
                    adapter,
                    serialization,
                });

                const handleMessage = (msg: any) => {
                    if (isChannelMessage(msg)) {
                        handleChannelMessage(msg);
                    } else if (isCallResponse(msg) && msg.taskId) {
                        const task = tasks.get(msg.taskId);

                        if (!task)
                            return;

                        if (msg.type === "return" || msg.type === "error") {
                            if (msg.type === "error") {
                                const err = msg.error?.constructor === Object
                                    ? (fromObject(msg.error) ?? msg.error)
                                    : msg.error;

                                if (err instanceof Error &&
                                    (err.name === "DOMException" || adapter === "child_process") &&
                                    (err.message.includes("not be cloned") ||
                                        err.message.includes("Do not know how to serialize")
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
                                if (task.resolver) {
                                    task.resolver.resolve(msg.value);
                                } else {
                                    task.result = { value: msg.value };
                                }

                                if (task.channel) {
                                    task.channel.close();
                                }
                            }

                            if (poolRecord) {
                                poolRecord.tasks.delete(msg.taskId);

                                if (!poolRecord.tasks.size) {
                                    if (isNode || isBun) {
                                        // Allow the main thread to exit if the event loop is empty.
                                        (worker as NodeWorker | BunWorker | ChildProcess).unref();
                                    }
                                }

                                { // GC: clean long-time unused workers
                                    const now = Date.now();
                                    const idealItems: PoolRecord[] = [];

                                    // The `workerPool` of this key in the pool map may have been
                                    // modified by other routines, we need to retrieve the newest
                                    // value.
                                    const remainItems = workerPools.get(poolKey)?.filter(item => {
                                        const ideal = !item.tasks.size
                                            && (now - item.lastAccess) >= 300_000;

                                        if (ideal) {
                                            idealItems.push(item);
                                        }

                                        return !ideal;
                                    });

                                    if (remainItems?.length) {
                                        workerPools.set(poolKey, remainItems);
                                    } else {
                                        workerPools.delete(poolKey);
                                    }

                                    idealItems.forEach(async item => {
                                        const worker = await item.getWorker;

                                        if (typeof (worker as any)["terminate"] === "function") {
                                            await (worker as Worker | BunWorker | NodeWorker).terminate();
                                        } else {
                                            (worker as ChildProcess).kill();
                                        }
                                    });
                                }
                            }
                        } else if (msg.type === "yield") {
                            task.channel?.push({ value: msg.value, done: msg.done as boolean });

                            if (msg.done) {
                                // The final message of yield event is the return value.
                                handleMessage({
                                    type: "return",
                                    value: msg.value,
                                    taskId: msg.taskId,
                                } satisfies CallResponse);
                            }
                        } else if (msg.type === "gen") {
                            task.generate?.();
                        }
                    }
                };

                if (isNode) {
                    (worker as NodeWorker | ChildProcess).on("message", handleMessage);
                } else if (isBun) {
                    if (adapter === "child_process") {
                        (worker as ChildProcess).on("message", handleMessage);
                    } else {
                        (worker as BunWorker).onmessage = (ev) => handleMessage(ev.data);
                    }
                } else {
                    (worker as Worker).onmessage = (ev) => handleMessage(ev.data);
                }

                return worker;
            })(),
            adapter,
            serialization,
            tasks: new Set(),
            lastAccess: Date.now(),
        });
    } else {
        poolRecord = workerPool[taskId % workerPool.length];
        poolRecord!.lastAccess = Date.now();
    }

    poolRecord!.tasks.add(taskId);

    const worker = await poolRecord!.getWorker;

    if (isNode || isBun) {
        // Prevent premature exit in the main thread.
        (worker as NodeWorker | BunWorker | ChildProcess).ref();
    }

    return worker;
}

export function wrapArgs<A extends any[]>(
    args: A,
    getWorker: Promise<Worker | BunWorker | NodeWorker | ChildProcess>
): {
    args: A,
    transferable: Transferable[];
} {
    const transferable: Transferable[] = [];
    args = args.map(arg => {
        if (!arg || typeof arg !== "object" || Array.isArray(arg)) {
            return arg;
        } else if (arg instanceof Channel) {
            return wrapChannel(arg, (type, msg, channelId) => {
                getWorker.then(worker => {
                    if (typeof (worker as any)["postMessage"] === "function") {
                        (worker as Worker).postMessage({
                            type,
                            value: msg,
                            channelId,
                        } satisfies ChannelMessage);
                    } else {
                        (worker as ChildProcess).send({
                            type,
                            value: msg,
                            channelId,
                        } satisfies ChannelMessage);
                    }
                });
            });
        } else if (arg[shouldTransfer]) {
            transferable.push(arg);
            return arg;
        } else {
            return arg;
        }
    }) as A;

    return { args, transferable };
}

async function safeRemoteCall(
    worker: Worker | BunWorker | NodeWorker | ChildProcess,
    req: CallRequest,
    transferable: Transferable[] = [],
    taskId: number = 0
) {
    try {
        if (typeof (worker as any)["postMessage"] === "function") {
            (worker as Worker).postMessage(req, transferable);
        } else {
            await new Promise<void>((resolve, reject) => {
                (worker as ChildProcess).send(req, err => err ? reject(err) : resolve());
            });
        }
    } catch (err) {
        taskId && tasks.delete(taskId);

        if (typeof (worker as any)["unref"] === "function") {
            (worker as BunWorker | NodeWorker | ChildProcess).unref();
        }

        throw err;
    }
}

function createRemoteCall(
    modId: string,
    fn: string,
    args: any[],
    baseUrl: string | undefined = undefined,
    options: {
        adapter: "worker_threads" | "child_process";
        serialization: "advanced" | "json";
    }
) {
    const taskId = taskIdCounter.next().value as number;
    tasks.set(taskId, { module: baseUrl ? new URL(modId, baseUrl).href : modId, fn });

    let getWorker = acquireWorker(taskId, options);
    const { args: _args, transferable } = wrapArgs(args, getWorker);

    getWorker = getWorker.then(async (worker) => {
        const req = createCallRequest({
            script: modId,
            fn,
            args: _args,
            taskId,
            baseUrl: baseUrl as string
        });

        await safeRemoteCall(worker, req, transferable, taskId);

        return worker;
    });

    return new ThenableAsyncGenerator({
        then(onfulfilled, onrejected) {
            const task = tasks.get(taskId) as RemoteTask;

            if (task.error) {
                tasks.delete(taskId);
                return onrejected?.(task.error);
            } else if (task.result) {
                tasks.delete(taskId);
                return onfulfilled?.(task.result.value);
            } else {
                return getWorker.then(() => new Promise((resolve, reject) => {
                    task.resolver = {
                        resolve: (value) => {
                            tasks.delete(taskId);
                            resolve(value);
                        },
                        reject: (err) => {
                            tasks.delete(taskId);
                            reject(err);
                        }
                    };
                })).then(onfulfilled, onrejected);
            }
        },
        async next(input) {
            const task = tasks.get(taskId) as RemoteTask;

            if (task.error) {
                const err = task.error;
                tasks.delete(taskId);
                throw err;
            } else if (task.result) {
                const value = task.result.value;
                tasks.delete(taskId);
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
                const req = createCallRequest({
                    script: modId,
                    fn,
                    args: args,
                    taskId,
                    type: "next",
                    baseUrl: baseUrl as string,
                });

                await safeRemoteCall(worker, req, transferable, taskId);

                return await task.channel.pop();
            }
        },
        async return(value) {
            tasks.delete(taskId);
            const worker = await getWorker;
            const { args, transferable } = wrapArgs([value], getWorker);
            const req = createCallRequest({
                script: modId,
                fn,
                args: args,
                taskId,
                type: "return",
                baseUrl: baseUrl as string,
            });

            await safeRemoteCall(worker, req, transferable, taskId);

            return { value, done: true };
        },
        async throw(err) {
            tasks.delete(taskId);
            const worker = await getWorker;
            const req = createCallRequest({
                script: modId,
                fn,
                args: [err],
                taskId,
                type: "throw",
                baseUrl: baseUrl as string,
            });

            await safeRemoteCall(worker, req, transferable, taskId);

            throw err;
        },
    } as ThenableAsyncGeneratorLike);
}

function createLocalCall(
    modId: string,
    fn: string,
    args: any[],
    baseUrl: string | undefined = undefined
) {
    const getReturns = resolveModule(modId, baseUrl).then(module => {
        return module[fn](...args);
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
    const lines = stackTrace.split("\n");
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
            baseUrl = "file://" + baseUrl;
        }
    }

    return baseUrl;
}

/**
 * Wraps a module and run its functions in worker threads.
 * 
 * In Node.js and Bun, the `module` can be either an ES module or a CommonJS module,
 * **node_modules** and built-in modules are also supported.
 * 
 * In browsers and Deno, the `module` can only be an ES module.
 * 
 * In Bun and Deno, the `module` can also be a TypeScript file.
 * 
 * Data are cloned and transferred between threads via **Structured Clone Algorithm** (by default).
 * 
 * Apart from the standard data types supported by the algorithm, {@link Channel} can also be
 * used to transfer data between threads. To do so, just passed a channel instance to the threaded
 * function.
 * 
 * But be aware, channel can only be used as a parameter, return a channel from the threaded
 * function is not allowed. And the channel can only be used for one threaded function at a time,
 * once passed, the data can only be transferred into and out-from the function.
 * 
 * The difference between using channel and generator function for streaming processing is, for a
 * generator function, `next(value)` is coupled with a `yield value`, the process is blocked
 * between **next** calls, channel doesn't have this limit, we can use it to stream all the data
 * into the function before processing and receiving any result.
 * 
 * @example
 * ```ts
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 * 
 * @example
 * ```ts
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
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * 
 * const channel = chan<number>();
 * const length = mod.twoTimesValues(channel);
 * 
 * for (const value of Number.sequence(0, 9)) {
 *     await channel.push({ value, done: value === 9 });
 * }
 * 
 * const results = (await readAll(channel)).map(item => item.value);
 * console.log(results);
 * console.log(await length);
 * // output:
 * // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
 * // 10
 * ```
 */
function parallel<M extends { [x: string]: any; }>(
    module: string | (() => Promise<M>),
    options: {
        /**
         * Choose whether to use `worker_threads` or `child_process` for creating the worker
         * thread. The default setting is `worker_threads`.
         * 
         * In browsers and Deno, this option is ignored and will always use the web worker.
         * 
         * We should always consider using `worker_threads` over `child_process` since it consumes
         * less system resources. However, As I've tested, `process.send(json)` performs about
         * 20% ~ 30% more efficient than `postMessage()`, so `child_process` along with `json`
         * serialization may suits more for some edge scenarios. 
         */
        adapter?: "worker_threads" | "child_process";
        /**
         * When using `child_process` adapter, this option instructs which serialization algorithm
         * should be used to serialize the data for transferring between the parent and the child
         * process. The default setting is `advanced` (structured clone algorithm).
         * 
         * NOTE: this option only works in Node.js, Bun doesn't support `json` serialization and
         * will always use `advanced`.
         */
        serialization?: "advanced" | "json";
    } = {}
): ThreadedFunctions<M> & {
    [terminate]: () => Promise<void>;
} {
    const adapter = options?.adapter || "worker_threads";
    const serialization = adapter === "worker_threads"
        ? "advanced"
        : (options?.serialization || (isBeforeNode14 ? "json" : "advanced"));
    const modId = sanitizeModuleId(module, true);
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

    return new Proxy({
        [terminate]: async () => {
            const poolKey = adapter + ":" + serialization;
            const workerPool = workerPools.get(poolKey);

            if (workerPool) {
                workerPools.delete(poolKey);

                for (const { getWorker } of workerPool) {
                    const worker = await getWorker;

                    if (typeof (worker as any)["terminate"] === "function") {
                        await (worker as Worker | BunWorker | NodeWorker).terminate();
                    } else {
                        (worker as ChildProcess).kill();
                    }
                }
            }
        },
    } as any, {
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
                        return createRemoteCall(modId, prop, args, baseUrl, {
                            adapter,
                            serialization,
                        });
                    } else {
                        return createLocalCall(modId, prop, args, baseUrl);
                    }
                }
            };

            return obj[prop];
        }
    }) as any;
}

namespace parallel {
    /**
     * The maximum number of workers allowed to exist at the same time. If not set, the program
     * by default uses CPU core numbers as the limit.
     */
    export var maxWorkers: number | undefined = undefined;

    /**
     * In browsers, by default, the program loads the worker entry directly from GitHub,
     * which could be slow due to poor internet connection, we can copy the entry file
     * `bundle/worker.mjs` to a local path of our website and set this option to that path
     * so that it can be loaded locally.
     * 
     * Or, if the code is bundled, the program won't be able to automatically locate the entry
     * file in the file system, in such case, we can also copy the entry file
     * (`bundle/worker.mjs` for Bun, Deno and the browser, `bundle/worker-node.mjs` for Node.js)
     * to a local directory and supply this option instead.
     */
    export var workerEntry: string | undefined = undefined;

    /**
     * Marks the given data to be transferred instead of cloned to the worker thread.
     * Once transferred, the data is no longer available on the sending end.
     * 
     * Currently, only `ArrayBuffer` is guaranteed to be transferable across all supported
     * JavaScript runtimes.
     * 
     * Be aware, the transferable object can only be used as a parameter and only works with
     * `worker_threads` adapter, return a transferable object from the threaded function is
     * not supported at the moment and will always be cloned.
     * 
     * NOTE: always prefer channel for transferring large amount of data in streaming fashion
     * than sending them as transferrable objects, it consumes less memory and does not transfer
     * the ownership of the data, and supports `child_process` adapter as well.
     * 
     * @example
     * ```ts
     * const mod = parallel(() => import("./examples/worker.mjs"));
     * 
     * const arr = Uint8Array.from([0, 1, 2]);
     * const length = await mod.transfer(parallel.transfer(arr.buffer));
     * 
     * console.assert(length === 3);
     * console.assert(arr.byteLength === 0);
     * ```
     */
    export function transfer<T extends Transferable>(data: T): T {
        // @ts-ignore
        data[shouldTransfer] = true;
        return data;
    }
}

export default parallel;
