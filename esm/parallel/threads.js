import { Channel } from '../chan.js';
import { isNode, isBun, isDeno, isNodeLike, isNodeBelow14 } from '../env.js';
import { wrapChannel, isChannelMessage, handleChannelMessage } from './channel.js';
import { getObjectURL } from '../module/util.js';
import { isPlainObject } from '../object.js';
import { serial } from '../number.js';
import { fromErrorEvent, isDOMException, isAggregateError, toObject, getErrorConstructor, fromObject } from '../error.js';
import { join, toFsPath, cwd, extname, resolve, dirname } from '../path.js';
import { unrefTimer } from '../runtime.js';
import Exception from '../error/Exception.js';
import { isUrl, endsWith } from '../path/util.js';

const workerIdCounter = serial(true);
let workerPool = [];
let gcTimer;
const remoteTasks = new Map();
const getMaxParallelism = (async () => {
    if (typeof navigator === "object" && navigator.hardwareConcurrency) {
        return navigator.hardwareConcurrency;
    }
    else if (isNode) {
        const os = await import('node:os');
        if (typeof os.availableParallelism === "function") {
            return os.availableParallelism();
        }
        else {
            return os.cpus().length;
        }
    }
    else {
        return 8;
    }
})();
function isCallResponse(msg) {
    return msg
        && typeof msg === "object"
        && ["return", "yield", "error", "gen"].includes(msg.type);
}
function getModuleDir(importMetaPath) {
    if (extname(importMetaPath) === ".ts") {
        return resolve(importMetaPath, "../..");
    }
    let _dirname = dirname(importMetaPath);
    if (endsWith(_dirname, "jsext/bundle")) {
        // The application imports the bundled version of this module
        return dirname(_dirname);
    }
    else {
        // The application imports the compiled version of this module
        return resolve(_dirname, "../..");
    }
}
async function getWorkerEntry(parallel = {}) {
    if (isDeno) {
        if (parallel.workerEntry) {
            return parallel.workerEntry;
        }
        else if (import.meta["main"]) {
            // The code is bundled, try the remote worker entry.
            if (import.meta.url.includes("jsr.io")) {
                return "jsr:@ayonli/jsext/worker.ts";
            }
            else {
                return "https://ayonli.github.io/jsext/bundle/worker.mjs";
            }
        }
        else {
            if (import.meta.url.includes("jsr.io")) {
                return "jsr:@ayonli/jsext/worker.ts";
            }
            else {
                const _dirname = getModuleDir(import.meta.url);
                return join(_dirname, "worker.ts");
            }
        }
    }
    else if (isNodeLike) {
        if (parallel.workerEntry) {
            return parallel.workerEntry;
        }
        const _filename = toFsPath(import.meta.url);
        if (_filename === process.argv[1]) {
            // The code is bundled, try the worker entry in node_modules
            // (hope it exists).
            const _dirname = join(cwd(), "node_modules/@ayonli/jsext");
            if (isBun) {
                if (extname(_filename) === ".ts") {
                    return join(_dirname, "worker.ts");
                }
                else {
                    return join(_dirname, "bundle/worker.mjs");
                }
            }
            else {
                return join(_dirname, "bundle/worker-node.mjs");
            }
        }
        else {
            const _dirname = getModuleDir(_filename);
            if (isBun) {
                if (extname(_filename) === ".ts") {
                    return join(_dirname, "worker.ts");
                }
                else {
                    return join(_dirname, "bundle/worker.mjs");
                }
            }
            else {
                return join(_dirname, "bundle/worker-node.mjs");
            }
        }
    }
    else {
        if (parallel.workerEntry) {
            if (isUrl(parallel.workerEntry)) {
                return await getObjectURL(parallel.workerEntry);
            }
            else {
                return parallel.workerEntry;
            }
        }
        else {
            const url = "https://ayonli.github.io/jsext/bundle/worker.mjs";
            return await getObjectURL(url);
        }
    }
}
async function createWorker(options) {
    let { adapter = "worker_threads", parallel } = options;
    const entry = await getWorkerEntry(parallel);
    if (isNode || isBun) {
        if (adapter === "child_process") {
            const { fork } = await import('node:child_process');
            const serialization = isNodeBelow14 ? "json" : "advanced";
            const worker = fork(entry, ["--worker-thread"], {
                stdio: "inherit",
                serialization,
            });
            const workerId = worker.pid;
            await new Promise((resolve, reject) => {
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
        }
        else if (isNode) {
            const { Worker } = await import('node:worker_threads');
            const worker = new Worker(entry, { argv: ["--worker-thread"] });
            const workerId = worker.threadId;
            await new Promise((resolve, reject) => {
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
        }
        else { // isBun
            const worker = new Worker(entry, { type: "module" });
            const workerId = workerIdCounter.next().value;
            await new Promise((resolve, reject) => {
                worker.onerror = (ev) => {
                    reject(new Error(ev.message || "Unable to start the worker."));
                };
                worker.addEventListener("open", () => {
                    // @ts-ignore
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
    }
    else { // Deno and browsers
        const worker = new Worker(entry, { type: "module" });
        const workerId = workerIdCounter.next().value;
        return {
            worker,
            workerId,
            kind: "web_worker",
        };
    }
}
function handleWorkerMessage(poolRecord, worker, msg) {
    var _a, _b, _c, _d;
    if (isChannelMessage(msg)) {
        handleChannelMessage(msg);
    }
    else if (isCallResponse(msg) && msg.taskId) {
        const task = remoteTasks.get(msg.taskId);
        if (!task)
            return;
        if (msg.type === "return" || msg.type === "error") {
            if (msg.type === "error") {
                const err = isPlainObject(msg.error)
                    ? ((_a = fromObject(msg.error)) !== null && _a !== void 0 ? _a : msg.error)
                    : msg.error;
                if (err instanceof Error &&
                    (err.message.includes("not be cloned")
                        || ((_b = err.stack) === null || _b === void 0 ? void 0 : _b.includes("not be cloned")) // Node.js v16-
                        || err.message.includes("Do not know how to serialize") // JSON error
                    )) {
                    Object.defineProperty(err, "stack", {
                        configurable: true,
                        enumerable: false,
                        writable: true,
                        value: (err.stack ? err.stack + "\n    " : "")
                            + `at ${task.fn} (${task.module})`,
                    });
                }
                if (task.promise) {
                    task.promise.reject(err);
                    if (task.channel) {
                        task.channel.close();
                    }
                }
                else if (task.channel) {
                    task.channel.close(err);
                }
                else {
                    task.error = err;
                }
            }
            else {
                const value = unwrapReturnValue(msg.value);
                if (task.promise) {
                    task.promise.resolve(value);
                }
                else {
                    task.result = { value };
                }
                if (task.channel) {
                    task.channel.close();
                }
            }
            poolRecord.tasks.delete(msg.taskId);
            if (!poolRecord.tasks.size && typeof worker.unref === "function") {
                // Allow the main thread to exit if the event
                // loop is empty.
                worker.unref();
            }
        }
        else if (msg.type === "yield") {
            const value = unwrapReturnValue(msg.value);
            (_c = task.channel) === null || _c === void 0 ? void 0 : _c.send({ value, done: msg.done });
            if (msg.done) {
                // The final message of yield event is the
                // return value.
                handleWorkerMessage(poolRecord, worker, {
                    type: "return",
                    value,
                    taskId: msg.taskId,
                });
            }
        }
        else if (msg.type === "gen") {
            (_d = task.generate) === null || _d === void 0 ? void 0 : _d.call(task);
        }
    }
}
function handleWorkerClose(poolRecord, err) {
    for (const taskId of poolRecord.tasks) {
        poolRecord.tasks.delete(taskId);
        const task = remoteTasks.get(taskId);
        if (task) {
            if (task.promise) {
                task.promise.reject(err);
                if (task.channel) {
                    task.channel.close();
                }
            }
            else if (task.channel) {
                task.channel.close(err);
            }
            else {
                task.error = err;
            }
        }
    }
    workerPool = workerPool.filter(item => item !== poolRecord);
}
async function acquireWorker(taskId, parallel) {
    const maxWorkers = parallel.maxWorkers || await getMaxParallelism;
    let poolRecord = workerPool.find(item => !item.tasks.size);
    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
    }
    else if (workerPool.length < maxWorkers) {
        workerPool.push(poolRecord = {
            getWorker: (async () => {
                const worker = (await createWorker({ parallel }))
                    .worker;
                const handleMessage = handleWorkerMessage.bind(void 0, poolRecord, worker);
                const handleClose = handleWorkerClose.bind(void 0, poolRecord);
                if (isNode) {
                    worker.on("message", handleMessage)
                        .on("error", handleClose); // In Node.js, worker will exit once erred.
                }
                else if (isBun) {
                    const _worker = worker;
                    _worker.onmessage = (ev) => handleMessage(ev.data);
                    _worker.onerror = () => _worker.terminate(); // terminate once erred
                    _worker.addEventListener("close", ((ev) => {
                        handleClose(new Error(ev.reason + " (" + ev.code + ")"));
                    }));
                }
                else {
                    const _worker = worker;
                    _worker.onmessage = (ev) => handleMessage(ev.data);
                    _worker.onerror = (ev) => {
                        var _a;
                        _worker.terminate(); // ensure termination
                        handleClose((_a = fromErrorEvent(ev)) !== null && _a !== void 0 ? _a : new Error("worker exited"));
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
                const idealItems = [];
                workerPool = workerPool.filter(item => {
                    const ideal = !item.tasks.size
                        && (now - item.lastAccess) >= 10000;
                    if (ideal) {
                        idealItems.push(item);
                    }
                    return !ideal;
                });
                idealItems.forEach(async (item) => {
                    const worker = await item.getWorker;
                    await worker.terminate();
                });
            }, 1000);
            unrefTimer(gcTimer);
        }
    }
    else {
        poolRecord = workerPool[taskId % workerPool.length];
        poolRecord.lastAccess = Date.now();
    }
    poolRecord.tasks.add(taskId);
    const worker = await poolRecord.getWorker;
    if ("ref" in worker && typeof worker.ref === "function") {
        // Prevent premature exit in the main thread.
        worker.ref();
    }
    return worker;
}
function wrapArgs(args, getWorker) {
    const transferable = [];
    args = args.map(arg => {
        if (arg instanceof Channel) {
            return wrapChannel(arg, (type, msg, channelId) => {
                getWorker.then(worker => {
                    if (typeof worker["postMessage"] === "function") {
                        try {
                            worker.postMessage({
                                type,
                                value: msg,
                                channelId,
                            });
                        }
                        catch (err) {
                            // Suppress error when sending `close` command to
                            // the channel in the worker thread when the thread
                            // is terminated. This situation often occurs when
                            // using `run()` to call function and the `result()`
                            // is called before `channel.close()`.
                            if (!(type === "close" &&
                                String(err).includes("Worker has been terminated"))) {
                                throw err;
                            }
                        }
                    }
                    else {
                        worker.send({
                            type,
                            value: msg,
                            channelId,
                        });
                    }
                });
            });
        }
        else if ((arg instanceof Exception)
            || isDOMException(arg)
            || isAggregateError(arg)) {
            return toObject(arg);
        }
        if (arg instanceof ArrayBuffer) {
            transferable.push(arg);
        }
        else if (isPlainObject(arg)) {
            for (const key of Object.getOwnPropertyNames(arg)) {
                const value = arg[key];
                if (value instanceof ArrayBuffer) {
                    transferable.push(value);
                }
                else if ((value instanceof Exception)
                    || isDOMException(value)
                    || isAggregateError(value)) {
                    arg[key] = toObject(value);
                }
            }
        }
        else if (Array.isArray(arg)) {
            arg = arg.map(item => {
                if (item instanceof ArrayBuffer) {
                    transferable.push(item);
                    return item;
                }
                else if ((item instanceof Exception)
                    || isDOMException(item)
                    || isAggregateError(item)) {
                    return toObject(item);
                }
                else {
                    return item;
                }
            });
        }
        return arg;
    });
    return { args, transferable };
}
function unwrapReturnValue(value) {
    if (isPlainObject(value) &&
        typeof value["@@type"] === "string" &&
        getErrorConstructor(value["@@type"])) {
        return fromObject(value);
    }
    return value;
}

export { acquireWorker, createWorker, getMaxParallelism, isCallResponse, remoteTasks, unwrapReturnValue, wrapArgs };
//# sourceMappingURL=threads.js.map
