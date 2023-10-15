import type { Worker as NodeWorker } from "node:worker_threads";
import type { ChildProcess } from "node:child_process";
import { ThenableAsyncGenerator, ThenableAsyncGeneratorLike } from "./external/thenable-generator/index.ts";
import chan, { Channel } from "./chan.ts";
import { sequence } from "./number/index.ts";
import { trim } from "./string/index.ts";
import { fromObject } from "./error/index.ts";

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

const isNode = typeof process === "object" && !!process.versions?.node;
const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
declare var Deno: any;
declare var Bun: any;

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

export type FFIRequest = {
    type: "ffi" | "next" | "return" | "throw";
    script: string;
    baseUrl: string;
    fn: string;
    args: any[];
    taskId?: number | undefined;
};

export function createFFIRequest(
    script: string,
    fn: string,
    args: any[],
    taskId: number | undefined = undefined,
    type: "ffi" | "next" | "return" | "throw" = "ffi"
): FFIRequest {
    const msg: FFIRequest = { type, baseUrl: "", script, fn, args, taskId };

    if (typeof Deno === "object") {
        msg.baseUrl = "file://" + Deno.cwd() + "/";
    } else if (isNode) {
        if (IsPath.test(script)) {
            // Only set baseUrl for relative modules, don't set it for node modules.
            msg.baseUrl = process.cwd();
        }
    } else if (typeof location === "object") {
        msg.baseUrl = location.href;
    }

    return msg;
}

export type FFIResponse = {
    type: "return" | "yield" | "error" | "gen";
    taskId?: number | undefined;
    value?: any;
    error?: Object;
    done?: boolean | undefined;
};

export function isFFIResponse(msg: any): msg is FFIResponse {
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

        if (adapter === "child_process") {
            const { fork } = await import("child_process");
            const isPrior14 = parseInt(process.version.slice(1)) < 14;
            const worker = fork(entry, {
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
            const worker = new Worker(entry);
            // `threadId` may not exist in Bun.
            const workerId = worker.threadId ?? workerIdCounter.next().value as number;

            return {
                worker,
                workerId,
                kind: "node_worker",
            };
        }
    } else {
        if (!entry) {
            if (typeof Deno === "object") {
                if ((import.meta as any)["main"]) {
                    // code is bundled, try the remote URL
                    entry = "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                } else {
                    entry = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker-web.mjs"
                    ].join("/");
                }
            } else {
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
            if (isFFIResponse(msg) && msg.taskId) {
                const task = tasks.get(msg.taskId);

                if (!task) {
                    return;
                }

                if (msg.type === "error") {
                    const err = msg.error instanceof Error
                        ? msg.error
                        : fromObject(msg.error as Object);

                    if (task.resolver) {
                        task.resolver.reject(err);
                    } else if (task.channel) {
                        task.channel.close(err);
                    } else {
                        task.error = err;
                    }
                } else if (msg.type === "return") {
                    if (task.resolver) {
                        task.resolver.resolve(msg.value);
                    } else {
                        task.result = { value: msg.value };
                    }

                    if (task.channel) {
                        task.channel.close();
                    }

                    if (poolRecord) {
                        poolRecord.tasks.delete(msg.taskId);

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
                        } satisfies FFIResponse);
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

    return worker;
}

function createCall(
    script: string | (() => Promise<any>),
    fn: string,
    args: any[]
) {
    const modId = sanitizeModuleId(script, true);
    const taskId = taskIdCounter.next().value as number;
    const task: RemoteTask = {};
    let worker: Worker | NodeWorker;

    tasks.set(taskId, task);

    return new ThenableAsyncGenerator({
        async then(onfulfilled, onrejected) {
            if (!worker) {
                worker = await acquireWorker(taskId);
                worker.postMessage(createFFIRequest(modId, fn, args, taskId));
            }

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
                if (!worker) {
                    worker = await acquireWorker(taskId);
                    worker.postMessage(createFFIRequest(modId, fn, args, taskId));
                    await new Promise<void>((resolve) => {
                        task.generate = resolve;
                    });
                }

                task.channel ??= chan(Infinity);
                worker.postMessage(createFFIRequest(modId, fn, [input], taskId, "next"));

                return await task.channel.pop();
            }
        },
        async return(value) {
            worker?.postMessage(createFFIRequest(modId, fn, [value], taskId, "return"));
            tasks.delete(taskId);
            return { value, done: true };
        },
        async throw(err) {
            worker?.postMessage(createFFIRequest(modId, fn, [err], taskId, "throw"));
            tasks.delete(taskId);
            throw err;
        },
    } as ThenableAsyncGeneratorLike);
}

/**
 * Wraps a module and run its functions in worker threads.
 * 
 * In Node.js and Bun, the `module` can be either a CommonJS module or an ES module,
 * **node_modules** and built-in modules are also supported.
 * 
 * In browser and Deno, the `module` can only be an ES module, and is relative to the current URL
 * (or working directory for Deno) if not absolute.
 * 
 * In Bun and Deno, the `module` can also be a TypeScript file.
 * 
 * @example
 * ```ts
 * const mod = parallel(() => import("./job-example.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 * 
 * @example
 * ```ts
 * const mod = parallel(() => import("./job-example.mjs"));
 * 
 * for await (const word of mod.sequence(["foo", "bar"])) {
 *     console.log(word);
 * }
 * // output:
 * // foo
 * // bar
 * ```
 */
function parallel<M extends { [x: string]: any; }>(module: () => Promise<M>): ThreadedFunctions<M> {
    return new Proxy(Object.create(null), {
        get: (_, prop: string) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args: Parameters<M["_"]>) => {
                    return createCall(module, prop, args);
                }
            };

            return obj[prop];
        }
    }) as any;
}

namespace parallel {
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

export default parallel;
