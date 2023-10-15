import type { Worker as NodeWorker } from "node:worker_threads";
import { ThenableAsyncGenerator, ThenableAsyncGeneratorLike } from "./external/thenable-generator/index.ts";
import run, { FFIResponse, createFFIRequest, createWorker, isFFIResponse, sanitizeModuleId } from "./run.ts";
import chan, { Channel } from "./chan.ts";
import { sequence } from "./number/index.ts";
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

async function acquireWorker(taskId: number) {
    let poolRecord = workerPool.find(item => !item.tasks.size);
    let worker: Worker | NodeWorker;

    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
        worker = poolRecord.worker as NodeWorker;
    } else if (workerPool.length < run.maxWorkers) {
        const res = await createWorker({ entry: run.workerEntry, adapter: "worker_threads" });
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
    tasks.set(taskId, task);

    let worker: Worker | NodeWorker;

    return new ThenableAsyncGenerator({
        async then(onfulfilled, onrejected) {
            if (!worker) {
                worker = await acquireWorker(taskId);
                worker.postMessage(createFFIRequest(modId, fn, args, taskId));
            }

            const task = tasks.get(taskId);

            if (task) {
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
            } else {
                throw new Error("task doesn't exist");
            }
        },
        async next(input) {
            const task = tasks.get(taskId);

            if (task) {
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
            } else {
                return { value: undefined, done: true };
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
 * Links a module whose functions are run in worker threads.
 * 
 * NOTE: This function also uses `run.maxWorkers` and `run.workerEntry` for worker configuration.
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
export default function parallel<M extends { [x: string]: any; }>(
    mod: () => Promise<M>
): ThreadedFunctions<M> {
    return new Proxy(Object.create(null), {
        get: (_, prop: string) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args: Parameters<M["_"]>) => {
                    return createCall(mod, prop, args);
                }
            };

            return obj[prop];
        }
    }) as any;
}
