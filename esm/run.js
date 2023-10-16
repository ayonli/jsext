import parallel, { sanitizeModuleId, createFFIRequest, createWorker, isFFIResponse } from './parallel.js';
import chan from './chan.js';
import deprecate from './deprecate.js';
import { fromObject } from './error/index.js';

var _a;
const isNode = typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
let workerPool = [];
// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue = [];
async function run(script, args = undefined, options = undefined) {
    if (options === null || options === void 0 ? void 0 : options.workerEntry) {
        deprecate("options.workerEntry", run, "set `run.workerEntry` instead");
    }
    const modId = sanitizeModuleId(script);
    const msg = createFFIRequest({
        script: modId,
        fn: (options === null || options === void 0 ? void 0 : options.fn) || "default",
        args: args !== null && args !== void 0 ? args : [],
    });
    const entry = (options === null || options === void 0 ? void 0 : options.workerEntry) || parallel.workerEntry;
    let error = null;
    let result;
    let resolver;
    let channel = undefined;
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
        if (isFFIResponse(msg)) {
            timeout && clearTimeout(timeout);
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
                if (channel) {
                    channel.close();
                }
            }
            else if (msg.type === "yield") {
                if (msg.done) {
                    // The final message of yield event is the return value.
                    handleMessage({ type: "return", value: msg.value });
                }
                else {
                    channel === null || channel === void 0 ? void 0 : channel.push(msg.value);
                }
            }
        }
    };
    const handleError = (err) => {
        err = err instanceof Error
            ? err
            : (typeof err === "object" ? fromObject(err) : err);
        error = err;
        timeout && clearTimeout(timeout);
        if (resolver) {
            resolver.reject(err);
        }
        if (channel) {
            channel.close(err);
        }
    };
    const handleExit = () => {
        var _a;
        timeout && clearTimeout(timeout);
        if (poolRecord) {
            // Clean the pool before resolve.
            workerPool = workerPool.filter(record => record !== poolRecord);
            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to create new worker.
                (_a = workerConsumerQueue.shift()) === null || _a === void 0 ? void 0 : _a();
            }
        }
        if (resolver) {
            error ? resolver.reject(error) : resolver.resolve(void 0);
        }
        else if (!error && !result) {
            result = { value: void 0 };
        }
        if (channel) {
            channel.close(error);
        }
    };
    if (isNode) {
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
            else if (workerPool.length < parallel.maxWorkers) {
                const res = await createWorker({ entry, adapter: "child_process" });
                worker = res.worker;
                workerId = res.workerId;
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
                // `run.maxWorkers`. If the the call doesn't keep-alive the worker, it will be
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
                }).then(() => run(modId, args, options));
            }
            release = () => {
                worker.unref(); // allow the main thread to exit if the event loop is empty
                // Remove the event listener so that later calls will not mess up.
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));
            if (ok) {
                worker.ref(); // prevent premature exit in the main thread
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
            else if (workerPool.length < parallel.maxWorkers) {
                const res = await createWorker({ entry, adapter: "worker_threads" });
                worker = res.worker;
                workerId = res.workerId;
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
                }).then(() => run(modId, args, options));
            }
            release = () => {
                worker.unref();
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => void (await worker.terminate());
            if (ok) {
                worker.ref();
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
        else if (workerPool.length < parallel.maxWorkers) {
            const res = await createWorker({ entry });
            worker = res.worker;
            workerId = res.workerId;
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
            }).then(() => run(modId, args, options));
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
        async abort(reason = undefined) {
            timeout && clearTimeout(timeout);
            if (reason) {
                if (reason instanceof Error) {
                    error = reason;
                }
                else if (typeof reason === "string") {
                    error = new Error(reason);
                }
                else {
                    // @ts-ignore
                    error = new Error("operation aborted", { cause: reason });
                }
            }
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
        iterate() {
            if (resolver) {
                throw new Error("result() has been called");
            }
            else if (result) {
                throw new TypeError("the response is not iterable");
            }
            channel = chan(Infinity);
            return {
                [Symbol.asyncIterator]: channel[Symbol.asyncIterator].bind(channel),
            };
        },
    };
}
// backward compatibility
Object.defineProperties(run, {
    maxWorkers: {
        set(v) {
            parallel.maxWorkers = v;
        },
        get() {
            return parallel.maxWorkers;
        },
    },
    workerEntry: {
        set(v) {
            parallel.workerEntry = v;
        },
        get() {
            return parallel.workerEntry;
        },
    },
});

export { run as default };
//# sourceMappingURL=run.js.map
