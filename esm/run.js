import { sequence } from './number/index.js';
import read from './read.js';

var _a;
const isNode = typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
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
let workerPool = [];
// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue = [];
/**
 * Runs a task in the `script` in a worker thread that can be aborted during runtime.
 *
 * In Node.js, the `script` can be either a CommonJS module or an ES module, and is relative to
 * the current working directory if not absolute.
 *
 * In browser or Deno, the `script` can only be an ES module, and is relative to the current URL
 * (or working directory for Deno) if not absolute.
 */
async function run(script, args = undefined, options = undefined) {
    var _a, _b;
    const msg = {
        type: "ffi",
        script,
        baseUrl: "",
        fn: (options === null || options === void 0 ? void 0 : options.fn) || "default",
        args: args !== null && args !== void 0 ? args : [],
    };
    if (typeof Deno === "object") {
        msg.baseUrl = "file://" + Deno.cwd() + "/";
    }
    else if (isNode) {
        msg.baseUrl = "file://" + process.cwd() + "/";
    }
    else if (typeof location === "object") {
        msg.baseUrl = location.href;
    }
    // `buffer` is used to store data pieces yielded by generator functions before they are
    // consumed. `error` and `result` serves similar purposes for function results.
    const buffer = [];
    let error = null;
    let result;
    let resolver;
    let iterator;
    let workerId;
    let poolRecord;
    let release;
    let terminate = () => Promise.resolve(void 0);
    const timeout = (options === null || options === void 0 ? void 0 : options.timeout) ? setTimeout(() => {
        const err = new Error(`operation timeout after ${options.timeout}ms`);
        if (resolver) {
            resolver.reject(err);
        }
        else {
            error = err;
        }
        terminate();
    }, options.timeout) : null;
    const handleMessage = (msg) => {
        var _a;
        if (msg && typeof msg === "object" && typeof msg.type === "string") {
            if (msg.type === "error") {
                return handleError(msg.error);
            }
            else if (msg.type === "return") {
                if (options === null || options === void 0 ? void 0 : options.keepAlive) {
                    // Release before resolve.
                    release === null || release === void 0 ? void 0 : release();
                    if (workerConsumerQueue.length) {
                        // Queued consumer now has chance to gain the worker.
                        (_a = workerConsumerQueue.shift()) === null || _a === void 0 ? void 0 : _a();
                    }
                }
                else {
                    terminate();
                }
                if (resolver) {
                    resolver.resolve(msg.value);
                }
                else {
                    result = { value: msg.value };
                }
            }
            else if (msg.type === "yield") {
                if (msg.done) {
                    // The final message of yield event is the return value.
                    handleMessage({ type: "return", value: msg.value });
                }
                else {
                    if (iterator) {
                        if (typeof iterator.dispatchEvent === "function") {
                            iterator.dispatchEvent(new MessageEvent("message", { data: msg.value }));
                        }
                        else {
                            iterator.emit("data", msg.value);
                        }
                    }
                    else {
                        buffer.push(msg.value);
                    }
                }
            }
        }
    };
    const handleError = (err) => {
        if (resolver) {
            resolver.reject(err);
        }
        else if (iterator) {
            if (typeof iterator.dispatchEvent === "function") {
                iterator.dispatchEvent(new MessageEvent("error", { data: err }));
            }
            else {
                iterator.emit("error", err);
            }
        }
        else {
            error = err;
        }
    };
    const handleExit = () => {
        var _a;
        if (poolRecord) {
            // Clean the pool before resolve.
            workerPool = workerPool.filter(record => record !== poolRecord);
            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to create new worker.
                (_a = workerConsumerQueue.shift()) === null || _a === void 0 ? void 0 : _a();
            }
        }
        if (resolver) {
            resolver.resolve(void 0);
        }
        else if (iterator) {
            if (typeof iterator.dispatchEvent === "function") {
                iterator.dispatchEvent(new MessageEvent("close"));
            }
            else {
                iterator.emit("close");
            }
        }
        else if (!error && !result) {
            result = { value: void 0 };
        }
    };
    if (isNode) {
        let entry = options === null || options === void 0 ? void 0 : options.workerEntry;
        if (!entry) {
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const dirname = path.dirname(fileURLToPath(import.meta.url));
            if (["cjs", "esm"].includes(path.basename(dirname))) { // compiled
                entry = path.join(path.dirname(dirname), "bundle", "worker.mjs");
            }
            else {
                entry = path.join(dirname, "worker.mjs");
            }
        }
        if ((options === null || options === void 0 ? void 0 : options.adapter) === "child_process") {
            let worker;
            let ok = true;
            poolRecord = workerPool.find(item => {
                return item.adapter === "child_process" && !item.busy;
            });
            if (poolRecord) {
                worker = poolRecord.worker;
                workerId = poolRecord.workerId;
                poolRecord.busy = true;
            }
            else if (workerPool.length < maxWorkerNum) {
                const { fork } = await import('child_process');
                const isPrior14 = parseInt(process.version.slice(1)) < 14;
                worker = fork(entry, {
                    stdio: "inherit",
                    serialization: isPrior14 ? "advanced" : "json",
                });
                workerId = worker.pid;
                ok = await new Promise((resolve) => {
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
            }
            else {
                // Put the current call in the consumer queue if there are no workers available,
                // once an existing call finishes, the queue will pop the its head consumer and
                // retry.
                return new Promise((resolve) => {
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
        }
        else {
            let worker;
            let ok = true;
            poolRecord = workerPool.find(item => {
                return item.adapter === "worker_threads" && !item.busy;
            });
            if (poolRecord) {
                worker = poolRecord.worker;
                workerId = poolRecord.workerId;
                poolRecord.busy = true;
            }
            else if (workerPool.length < maxWorkerNum) {
                const { Worker } = await import('worker_threads');
                worker = new Worker(entry);
                // `threadId` may not exist in Bun.
                workerId = (_a = worker.threadId) !== null && _a !== void 0 ? _a : workerIdCounter.next().value;
                ok = await new Promise((resolve) => {
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
            }
            else {
                return new Promise((resolve) => {
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
    }
    else {
        let worker;
        poolRecord = workerPool.find(item => {
            return item.adapter === "worker_threads" && !item.busy;
        });
        if (poolRecord) {
            worker = poolRecord.worker;
            workerId = poolRecord.workerId;
            poolRecord.busy = true;
        }
        else if (workerPool.length < maxWorkerNum) {
            let url;
            if (typeof Deno === "object") {
                // Deno can load the module regardless of MINE type.
                url = [
                    ...(import.meta.url.split("/").slice(0, -1)),
                    "worker-web.mjs"
                ].join("/");
            }
            else {
                const _url = (options === null || options === void 0 ? void 0 : options.workerEntry)
                    || "https://raw.githubusercontent.com/ayonli/jsext/main/bundle/worker-web.mjs";
                const res = await fetch(_url);
                let blob;
                if ((_b = res.headers.get("content-type")) === null || _b === void 0 ? void 0 : _b.startsWith("application/javascript")) {
                    blob = await res.blob();
                }
                else {
                    const buf = await res.arrayBuffer();
                    blob = new Blob([new Uint8Array(buf)], {
                        type: "application/javascript",
                    });
                }
                url = URL.createObjectURL(blob);
            }
            worker = new Worker(url, { type: "module" });
            workerId = workerIdCounter.next().value;
            workerPool.push(poolRecord = {
                workerId,
                worker,
                adapter: "worker_threads",
                busy: true,
            });
        }
        else {
            return new Promise((resolve) => {
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
            return await new Promise((resolve, reject) => {
                if (error) {
                    reject(error);
                }
                else if (result) {
                    resolve(result.value);
                }
                else {
                    resolver = { resolve, reject };
                }
            });
        },
        async *iterate() {
            if (resolver) {
                throw new Error("result() has been called");
            }
            else if (result) {
                throw new TypeError("the response is not iterable");
            }
            if (typeof MessageEvent === "function" && typeof EventTarget === "function") {
                iterator = new EventTarget();
                if (buffer.length) {
                    (async () => {
                        await Promise.resolve(null);
                        let msg;
                        while (msg = buffer.shift()) {
                            iterator.dispatchEvent(new MessageEvent("message", { data: msg }));
                        }
                    })().catch(console.error);
                }
                for await (const msg of read(iterator)) {
                    yield msg;
                }
            }
            else {
                const { EventEmitter } = await import('events');
                iterator = new EventEmitter();
                if (buffer.length) {
                    (async () => {
                        await Promise.resolve(null);
                        let msg;
                        while (msg = buffer.shift()) {
                            iterator.emit("data", msg);
                        }
                    })().catch(console.error);
                }
                for await (const msg of read(iterator)) {
                    yield msg;
                }
            }
        },
    };
}

export { run as default };
//# sourceMappingURL=run.js.map
