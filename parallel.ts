import type { Worker as NodeWorker, WorkerOptions } from "node:worker_threads";
import type { ChildProcess } from "node:child_process";
import { ThenableAsyncGenerator, ThenableAsyncGeneratorLike } from "./external/thenable-generator/index.ts";
import chan, { Channel, id } from "./chan.ts";
import { sequence } from "./number/index.ts";
import { trim } from "./string/index.ts";
import type { Optional } from "./index.ts";
import { ChannelMessage, isChannelMessage, isNode, resolveModule } from "./util.ts";

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

const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
declare var Deno: any;
declare var Bun: any;

const isMainThread = isNode
    ? (!process.argv.includes("--worker-thread") && !process.env["__WORKER_THREAD"])
    // @ts-ignore
    : typeof WorkerGlobalScope === "undefined";
const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const taskIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
type RemoteTask = {
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
let workerPool: {
    worker: Worker | NodeWorker;
    tasks: Set<number>;
    lastAccess: number;
}[] = [];
const channelStore = new Map<number, { channel: Channel<any>, raw: Pick<Channel<any>, "push" | "close">; }>();

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
        if (typeof Bun === "object") {
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
        if (typeof Deno === "object") {
            msg.baseUrl = "file://" + Deno.cwd() + "/";
        } else if (isNode) {
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
    adapter?: "worker_threads" | "child_process";
} = {}): Promise<{
    worker: Worker;
    workerId: number;
    kind: "web_worker";
} | {
    worker: NodeWorker;
    workerId: number;
    kind: "node_worker";
} | {
    worker: ChildProcess;
    workerId: number;
    kind: "node_process";
}> {
    let { entry, adapter } = options;

    if (isNode) {
        if (!entry) {
            const path = await import("path");
            const { fileURLToPath } = await import("url");
            const _filename = fileURLToPath(import.meta.url);

            if (_filename === process.argv[1]) {
                // The code is bundled, try the worker entry in node_modules (hope it exists).
                entry = "./node_modules/@ayonli/jsext/bundle/worker.mjs";
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

                if (typeof Bun === "object") {
                    entry = path.join(_dirname, "worker.ts");
                } else {
                    entry = path.join(_dirname, "bundle", "worker.mjs");
                }
            }
        }

        if (adapter === "child_process") {
            const { fork } = await import("child_process");
            const isPrior14 = parseInt(process.version.slice(1)) < 14;
            const worker = fork(entry, ["--worker-thread"], {
                stdio: "inherit",
                serialization: isPrior14 ? "advanced" : "json",
            });
            const workerId = worker.pid as number;

            return {
                worker,
                workerId,
                kind: "node_process",
            };
        } else {
            const { Worker } = await import("worker_threads");
            const options: WorkerOptions = {};

            if (typeof Bun === "object") {
                // Currently, Bun doesn't support `argv` option, use `env` for compatibility
                // support.
                options.env = { ...process.env, __WORKER_THREAD: "true" };
            } else {
                options.argv = ["--worker-thread"];
            }

            const worker = new Worker(entry, options);
            // `threadId` may not exist in Bun.
            const workerId = worker.threadId ?? workerIdCounter.next().value as number;

            return {
                worker,
                workerId,
                kind: "node_worker",
            };
        }
    } else {
        if (typeof Deno === "object") {
            if (!entry) {
                if ((import.meta as any)["main"]) {
                    // The code is bundled, try the remote worker entry.
                    entry = "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                } else {
                    entry = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker-web.ts"
                    ].join("/");

                    // The application imports the compiled version of this module,
                    // redirect to the source worker entry.
                    if (entry.endsWith("/esm/worker-web.ts")) {
                        entry = entry.slice(0, -18) + "/worker-web.ts";
                    }
                }
            }
        } else {
            // Use fetch to download the script and compose an object URL can bypass CORS
            // security constraint in the browser.
            const url = entry || "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
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
    let poolRecord = workerPool.find(item => !item.tasks.size);
    let worker: Worker | NodeWorker;

    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
        worker = poolRecord.worker as NodeWorker;
    } else if (workerPool.length < parallel.maxWorkers) {
        const res = await createWorker({ entry: parallel.workerEntry, adapter: "worker_threads" });
        worker = res.worker as Worker | NodeWorker;

        const handleMessage = (msg: any) => {
            if (isChannelMessage(msg)) {
                const channel = channelStore.get(msg.channelId);

                if (!channel)
                    return;

                if (msg.type === "push") {
                    channel.raw.push(msg.value);
                } else if (msg.type === "close") {
                    channel.raw.close(msg.value);
                    channelStore.delete(msg.channelId);
                }
            } else if (isCallResponse(msg) && msg.taskId) {
                const task = tasks.get(msg.taskId);

                if (!task)
                    return;

                if (msg.type === "return" || msg.type === "error") {
                    if (msg.type === "error") {
                        if (task.resolver) {
                            task.resolver.reject(msg.error);

                            if (task.channel) {
                                task.channel.close();
                            }
                        } else if (task.channel) {
                            task.channel.close(msg.error as Error);
                        } else {
                            task.error = msg.error;
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
                            if (isNode) {
                                // Allow the main thread to exit if the event loop is empty.
                                (worker as NodeWorker).unref();
                            }
                        }

                        { // GC: clean long-time unused workers
                            const now = Date.now();
                            const idealItems: typeof workerPool = [];
                            workerPool = workerPool.filter(item => {
                                const ideal = !item.tasks.size && (now - item.lastAccess) >= 300_000;

                                if (ideal) {
                                    idealItems.push(item);
                                }

                                return !ideal;
                            });

                            idealItems.forEach(item => {
                                item.worker.terminate();
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
            (worker as NodeWorker).on("message", handleMessage);
            await new Promise<void>(resolve => (worker as NodeWorker).once("online", resolve));
        } else {
            (worker as Worker).onmessage = (ev) => handleMessage(ev.data);
        }

        workerPool.push(poolRecord = {
            worker,
            tasks: new Set(),
            lastAccess: Date.now(),
        });
    } else {
        poolRecord = workerPool[taskId % workerPool.length];
        poolRecord!.lastAccess = Date.now();
        worker = poolRecord!.worker as NodeWorker;
    }

    poolRecord!.tasks.add(taskId);

    if (isNode) {
        // Prevent premature exit in the main thread.
        (worker as NodeWorker).ref();
    }

    return worker;
}

function wrapChannel(
    channel: Channel<any>,
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
): object {
    const channelId = channel[id] as number;

    if (!channelStore.has(channelId)) {
        const push = channel.push.bind(channel);
        const close = channel.close.bind(channel);

        channelStore.set(channelId, { channel, raw: { push, close } });
    }

    Object.defineProperties(channel, {
        push: {
            configurable: true,
            writable: true,
            value: async (value: any) => {
                if (channel["state"] !== 1) {
                    throw new Error("the channel is closed");
                }

                await Promise.resolve(channelWrite("push", value, channelId));
            },
        },
        close: {
            configurable: true,
            writable: true,
            value: (err: Error | null = null) => {
                const record = channelStore.get(channelId);
                record?.raw.close(err);
                channelWrite("close", err, channelId);
                channelStore.delete(channelId);

                if (record) {
                    // recover to the original methods
                    Object.defineProperties(channel, {
                        push: {
                            configurable: true,
                            writable: true,
                            value: record.raw.push,
                        },
                        close: {
                            configurable: true,
                            writable: true,
                            value: record.raw.close,
                        },
                    });
                }
            },
        },
    });

    return { "@@type": "Channel", "@@id": channelId, "capacity": channel.capacity };
}

function createRemoteCall(
    modId: string,
    fn: string,
    args: any[],
    baseUrl: string | undefined = undefined
) {
    args = args.map(arg => {
        if (arg instanceof Channel) {
            return wrapChannel(arg, (type, msg, channelId) => {
                getWorker.then(worker => {
                    worker.postMessage({
                        type,
                        value: msg,
                        channelId,
                    } satisfies ChannelMessage);
                });
            });
        } else {
            return arg;
        }
    });

    const taskId = taskIdCounter.next().value as number;
    tasks.set(taskId, {});

    const getWorker = acquireWorker(taskId).then((worker) => {
        worker.postMessage(createCallRequest({
            script: modId,
            fn,
            args,
            taskId,
            baseUrl: baseUrl as string
        }));
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
                return new Promise((resolve, reject) => {
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
                }).then(onfulfilled, onrejected);
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

                worker.postMessage(createCallRequest({
                    script: modId,
                    fn,
                    args: [input],
                    taskId,
                    type: "next",
                    baseUrl: baseUrl as string,
                }));

                return await task.channel.pop();
            }
        },
        async return(value) {
            tasks.delete(taskId);
            const worker = await getWorker;
            worker.postMessage(createCallRequest({
                script: modId,
                fn,
                args: [value],
                taskId,
                type: "return",
                baseUrl: baseUrl as string,
            }));

            return { value, done: true };
        },
        async throw(err) {
            tasks.delete(taskId);
            const worker = await getWorker;
            worker.postMessage(createCallRequest({
                script: modId,
                fn,
                args: [err],
                taskId,
                type: "throw",
                baseUrl: baseUrl as string,
            }));

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
 * Data are cloned and transferred between threads via **Structured Clone Algorithm**.
 * 
 * Apart from the standard data types supported by the algorithm, {@link Channel} can also be
 * used to transfer data between threads. To do so, just passed a channel instance to the threaded
 * function.
 * 
 * But be aware, channel can only be used as a parameter, return a channel from the threaded
 * function is not allowed. And the channel can only be used for one threaded function at a
 * specific time, once passed, the data can only be transferred into and out-from the function.
 * 
 * The difference between using channel and generator function for streaming processing is, for a
 * generator function, `next(value)` is coupled with a `yield value`, the process is blocked
 * between **next** calls, channel doesn't have this limitation, we can use it to stream all
 * the data into the function before processing and receiving any result.
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
    module: string | (() => Promise<M>)
): ThreadedFunctions<M> {
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

    return new Proxy(Object.create(null), {
        get: (_, prop: string) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args: Parameters<M["_"]>) => {
                    if (isMainThread) {
                        return createRemoteCall(modId, prop, args, baseUrl);
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
     * The maximum number of workers allowed to exist at the same time.
     * 
     * In Bun, Deno and browsers, the default value is equivalent to
     * `navigator.hardwareConcurrency`.
     * 
     * In Node.js, the default value is `16`.
     */
    export var maxWorkers = typeof navigator === "object" ? navigator.hardwareConcurrency : 16;

    /**
     * In browsers, by default, the program loads the worker entry directly from GitHub,
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

export default parallel;
