import type { ChildProcess } from "node:child_process";
import { Channel } from "../../chan.ts";
import { BunWorker, NodeWorker, CallResponse, ChannelMessage } from "../types.ts";
import { isBun, isDeno, isNode, isNodePrior14 } from "../constants.ts";
import { handleChannelMessage, isChannelMessage, wrapChannel } from "./channel.ts";
import { isPlainObject } from "../../object/index.ts";
import { autoId } from "../../number/index.ts";
import {
    fromErrorEvent,
    fromObject,
    isAggregateError,
    isDOMException,
    toObject,
} from "../../error/index.ts";

declare var Deno: any;

const workerIdCounter = autoId();
type PoolRecord = {
    getWorker: Promise<Worker | BunWorker | NodeWorker>;
    tasks: Set<number>;
    lastAccess: number;
};
let workerPool: PoolRecord[] = [];
let gcTimer: number | NodeJS.Timeout;

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
export const remoteTasks = new Map<number, RemoteTask>();

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

export function isCallResponse(msg: any): msg is CallResponse {
    return msg
        && typeof msg === "object"
        && ["return", "yield", "error", "gen"].includes(msg.type);
}

export async function createWorker(options: {
    parallel: { workerEntry: string | undefined; };
    adapter?: "worker_threads" | "child_process";
}): Promise<{
    worker: Worker | BunWorker | NodeWorker | ChildProcess;
    workerId: number;
    kind: "web_worker" | "bun_worker" | "node_worker" | "node_process";
}> {
    let { adapter = "worker_threads", parallel } = options;
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

                if (_dirname.endsWith(path.join("jsext", "bundle"))) {
                    // The application imports the bundled version of this module
                    _dirname = path.dirname(_dirname);
                } else if ([
                    path.join("jsext", "cjs", "parallel", "utils"),
                    path.join("jsext", "esm", "parallel", "utils"),
                ].some(path => _dirname.endsWith(path))) {
                    // The application imports the compiled version of this module
                    _dirname = path.resolve(_dirname, "../../..");
                } else {
                    _dirname = path.resolve(_dirname, "../..");
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
                        const paths = import.meta.url.split("/").slice(0, -1);
                        let _dirname = paths.join("/");

                        if (_dirname.endsWith("/jsext/bundle")) {
                            _dirname = paths.slice(0, -1).join("/");
                        } else if (_dirname.endsWith("/jsext/cjs/parallel/utils")
                            || _dirname.endsWith("/jsext/esm/parallel/utils")
                        ) {
                            _dirname = paths.slice(0, -3).join("/");
                        } else {
                            _dirname = paths.slice(0, -2).join("/");
                        }

                        entry = _dirname + "/worker.ts";
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

export async function acquireWorker(taskId: number, parallel: {
    maxWorkers: number | undefined;
    workerEntry: string | undefined;
}) {
    const maxWorkers = parallel.maxWorkers || await getMaxParallelism;
    let poolRecord = workerPool.find(item => !item.tasks.size) as PoolRecord;

    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
    } else if (workerPool.length < maxWorkers) {
        workerPool.push(poolRecord = {
            getWorker: (async () => {
                const worker = (await createWorker({ parallel })).worker as Worker | BunWorker | NodeWorker;
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
