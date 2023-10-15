import { ThenableAsyncGenerator } from './external/thenable-generator/index.js';
import run, { sanitizeModuleId, createFFIRequest, createWorker, isFFIResponse } from './run.js';
import chan from './chan.js';
import { sequence } from './number/index.js';
import { fromObject } from './error/index.js';

var _a;
const isNode = typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const taskIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const tasks = new Map;
let workerPool = [];
async function acquireWorker(taskId) {
    let poolRecord = workerPool.find(item => !item.tasks.size);
    let worker;
    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
        worker = poolRecord.worker;
    }
    else if (workerPool.length < run.maxWorkers) {
        const res = await createWorker({ entry: run.workerEntry, adapter: "worker_threads" });
        worker = res.worker;
        const handleMessage = (msg) => {
            var _a, _b;
            if (isFFIResponse(msg) && msg.taskId) {
                const task = tasks.get(msg.taskId);
                if (!task) {
                    return;
                }
                if (msg.type === "error") {
                    const err = msg.error instanceof Error
                        ? msg.error
                        : fromObject(msg.error);
                    if (task.resolver) {
                        task.resolver.reject(err);
                    }
                    else if (task.channel) {
                        task.channel.close(err);
                    }
                    else {
                        task.error = err;
                    }
                }
                else if (msg.type === "return") {
                    if (task.resolver) {
                        task.resolver.resolve(msg.value);
                    }
                    else {
                        task.result = { value: msg.value };
                    }
                    if (task.channel) {
                        task.channel.close();
                    }
                    if (poolRecord) {
                        poolRecord.tasks.delete(msg.taskId);
                        { // GC: clean long-time unused workers
                            const now = Date.now();
                            const idealItems = [];
                            workerPool = workerPool.filter(item => {
                                const ideal = !item.tasks.size && (now - item.lastAccess) >= 300000;
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
                }
                else if (msg.type === "yield") {
                    (_a = task.channel) === null || _a === void 0 ? void 0 : _a.push({ value: msg.value, done: msg.done });
                    if (msg.done) {
                        // The final message of yield event is the return value.
                        handleMessage({
                            type: "return",
                            value: msg.value,
                            taskId: msg.taskId,
                        });
                    }
                }
                else if (msg.type === "gen") {
                    (_b = task.generate) === null || _b === void 0 ? void 0 : _b.call(task);
                }
            }
        };
        if (isNode) {
            worker.on("message", handleMessage);
            await new Promise(resolve => worker.once("online", resolve));
        }
        else {
            worker.onmessage = (ev) => handleMessage(ev.data);
        }
        workerPool.push(poolRecord = {
            worker,
            tasks: new Set(),
            lastAccess: Date.now(),
        });
    }
    else {
        poolRecord = workerPool[taskId % workerPool.length];
        poolRecord.lastAccess = Date.now();
        worker = poolRecord.worker;
    }
    poolRecord.tasks.add(taskId);
    return worker;
}
function createCall(script, fn, args) {
    const modId = sanitizeModuleId(script, true);
    const taskId = taskIdCounter.next().value;
    const task = {};
    tasks.set(taskId, task);
    let worker;
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
                    return onrejected === null || onrejected === void 0 ? void 0 : onrejected(task.error);
                }
                else if (task.result) {
                    tasks.delete(taskId);
                    return onfulfilled === null || onfulfilled === void 0 ? void 0 : onfulfilled(task.result.value);
                }
                else {
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
            }
            else {
                throw new Error("task doesn't exist");
            }
        },
        async next(input) {
            var _a;
            const task = tasks.get(taskId);
            if (task) {
                if (task.error) {
                    const err = task.error;
                    tasks.delete(taskId);
                    throw err;
                }
                else if (task.result) {
                    const value = task.result.value;
                    tasks.delete(taskId);
                    return { value, done: true };
                }
                else {
                    if (!worker) {
                        worker = await acquireWorker(taskId);
                        worker.postMessage(createFFIRequest(modId, fn, args, taskId));
                        await new Promise((resolve) => {
                            task.generate = resolve;
                        });
                    }
                    (_a = task.channel) !== null && _a !== void 0 ? _a : (task.channel = chan(Infinity));
                    worker.postMessage(createFFIRequest(modId, fn, [input], taskId, "next"));
                    return await task.channel.pop();
                }
            }
            else {
                return { value: undefined, done: true };
            }
        },
        async return(value) {
            worker === null || worker === void 0 ? void 0 : worker.postMessage(createFFIRequest(modId, fn, [value], taskId, "return"));
            tasks.delete(taskId);
            return { value, done: true };
        },
        async throw(err) {
            worker === null || worker === void 0 ? void 0 : worker.postMessage(createFFIRequest(modId, fn, [err], taskId, "throw"));
            tasks.delete(taskId);
            throw err;
        },
    });
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
function parallel(mod) {
    return new Proxy(Object.create(null), {
        get: (_, prop) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args) => {
                    return createCall(mod, prop, args);
                }
            };
            return obj[prop];
        }
    });
}

export { parallel as default };
//# sourceMappingURL=parallel.js.map
