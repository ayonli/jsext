import chan from './chan.js';
import { isPlainObject } from './object/index.js';
import { fromErrorEvent, fromObject } from './error/index.js';
import { isDeno, isNode, isBun, IsPath, isChannelMessage, handleChannelMessage } from './util.js';
import parallel, { getMaxParallelism, sanitizeModuleId, createWorker, wrapArgs, isCallResponse } from './parallel.js';

const workerPools = new Map();
// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue = [];
async function run(script, args = undefined, options = undefined) {
    var _a;
    const maxWorkers = run.maxWorkers || parallel.maxWorkers || await getMaxParallelism;
    const fn = (options === null || options === void 0 ? void 0 : options.fn) || "default";
    let modId = sanitizeModuleId(script);
    let baseUrl = undefined;
    if (isDeno) {
        baseUrl = "file://" + Deno.cwd() + "/";
    }
    else if (isNode || isBun) {
        if (IsPath.test(modId)) {
            // Only set baseUrl for relative modules, don't set it for node modules.
            baseUrl = "file://" + process.cwd() + "/";
        }
    }
    else if (typeof location === "object") {
        baseUrl = location.href;
    }
    if (baseUrl) {
        modId = new URL(modId, baseUrl).href;
    }
    const req = {
        type: "call",
        module: modId,
        fn,
        args: args !== null && args !== void 0 ? args : [],
    };
    const adapter = (options === null || options === void 0 ? void 0 : options.adapter) || "worker_threads";
    const workerPool = (_a = workerPools.get(adapter)) !== null && _a !== void 0 ? _a : workerPools.set(adapter, []).get(adapter);
    let poolRecord = workerPool.find(item => !item.busy);
    if (poolRecord) {
        poolRecord.busy = true;
    }
    else if (workerPool.length < maxWorkers) {
        // Fill the worker pool regardless the current call should keep-alive or not,
        // this will make sure that the total number of workers will not exceed the
        // `run.maxWorkers`. If the the call doesn't keep-alive the worker, it will be
        // cleaned after the call.
        workerPool.push(poolRecord = {
            getWorker: createWorker({ entry: parallel.workerEntry, adapter }),
            adapter,
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
    let error = null;
    let result;
    let resolver;
    let channel = undefined;
    let workerId;
    let release;
    let terminate = () => Promise.resolve(void 0);
    const timeout = (options === null || options === void 0 ? void 0 : options.timeout) ? setTimeout(async () => {
        const err = new Error(`operation timeout after ${options.timeout}ms`);
        error = err;
        await terminate();
        handleClose(err, true);
    }, options.timeout) : null;
    const handleMessage = async (msg) => {
        var _a, _b;
        if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        }
        else if (isCallResponse(msg)) {
            timeout && clearTimeout(timeout);
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
                                + `at ${fn} (${modId})`,
                        });
                    }
                    error = err;
                }
                else {
                    result = { value: msg.value };
                }
                (options === null || options === void 0 ? void 0 : options.keepAlive) || await terminate();
                handleClose(null, !(options === null || options === void 0 ? void 0 : options.keepAlive));
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
    const handleClose = (err, terminated = false) => {
        var _a, _b, _c;
        timeout && clearTimeout(timeout);
        if (!terminated) {
            // Release before resolve.
            release === null || release === void 0 ? void 0 : release();
            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to gain the worker.
                (_a = workerConsumerQueue.shift()) === null || _a === void 0 ? void 0 : _a();
            }
        }
        else if (poolRecord) {
            // Clean the pool before resolve.
            // The `workerPool` of this key in the pool map may have been modified by other
            // routines, we need to retrieve the newest value.
            const remainItems = (_b = workerPools.get(adapter)) === null || _b === void 0 ? void 0 : _b.filter(record => record !== poolRecord);
            if (remainItems === null || remainItems === void 0 ? void 0 : remainItems.length) {
                workerPools.set(adapter, remainItems);
            }
            else {
                workerPools.delete(adapter);
            }
            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to create new worker.
                (_c = workerConsumerQueue.shift()) === null || _c === void 0 ? void 0 : _c();
            }
        }
        if (err) {
            error !== null && error !== void 0 ? error : (error = err);
        }
        if (error) {
            if (resolver) {
                resolver.reject(error);
                if (channel) {
                    channel.close();
                }
            }
            else if (channel) {
                channel.close(error);
            }
        }
        else {
            result !== null && result !== void 0 ? result : (result = { value: void 0 });
            if (resolver) {
                resolver.resolve(result.value);
            }
            if (channel) {
                channel.close();
            }
        }
    };
    const safeRemoteCall = async (worker, req, transferable = []) => {
        try {
            if (typeof worker["postMessage"] === "function") {
                worker.postMessage(req, transferable);
            }
            else {
                await new Promise((resolve, reject) => {
                    worker.send(req, err => err ? reject(err) : resolve());
                });
            }
        }
        catch (err) {
            if (typeof worker["unref"] === "function") {
                worker.unref();
            }
            error = err;
            (options === null || options === void 0 ? void 0 : options.keepAlive) || await terminate();
            handleClose(null, !(options === null || options === void 0 ? void 0 : options.keepAlive));
            throw err;
        }
    };
    if (isNode || isBun) {
        if (adapter === "child_process") {
            const record = await poolRecord.getWorker;
            const worker = record.worker;
            workerId = record.workerId;
            worker.ref(); // prevent premature exit in the main thread
            worker.on("message", handleMessage);
            worker.once("exit", (code, signal) => {
                if (!error && !result) {
                    handleClose(new Error(`worker exited (${code !== null && code !== void 0 ? code : signal})`), true);
                }
            });
            release = () => {
                worker.unref(); // allow the main thread to exit if the event loop is empty
                // Remove the event listener so that later calls will not mess up.
                worker.off("message", handleMessage);
                worker.removeAllListeners("exit");
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));
            if (error) {
                // The worker take too long to start and timeout error already thrown.
                await terminate();
                throw error;
            }
            const { args } = wrapArgs(req.args, Promise.resolve(worker));
            req.args = args;
            await safeRemoteCall(worker, req);
        }
        else if (isNode) {
            const record = await poolRecord.getWorker;
            const worker = record.worker;
            const handleErrorEvent = (err) => {
                if (!error && !result) {
                    handleClose(err, true); // In Node.js, worker will exit once erred.
                }
            };
            workerId = record.workerId;
            worker.ref();
            worker.on("message", handleMessage);
            worker.once("error", handleErrorEvent);
            release = () => {
                worker.unref();
                worker.off("message", handleMessage);
                worker.off("error", handleErrorEvent);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => void (await worker.terminate());
            if (error) {
                await terminate();
                throw error;
            }
            const { args, transferable } = wrapArgs(req.args, Promise.resolve(worker));
            req.args = args;
            await safeRemoteCall(worker, req, transferable);
        }
        else { // isBun
            const record = await poolRecord.getWorker;
            const worker = record.worker;
            const handleCloseEvent = ((ev) => {
                if (!error && !result) {
                    handleClose(new Error(ev.reason + " (" + ev.code + ")"), true);
                }
            });
            workerId = record.workerId;
            worker.ref();
            worker.onmessage = (ev) => handleMessage(ev.data);
            worker.onerror = () => void worker.terminate(); // terminate once erred
            worker.addEventListener("close", handleCloseEvent);
            release = () => {
                worker.unref();
                worker.onmessage = null;
                worker.onerror = null;
                worker.removeEventListener("close", handleCloseEvent);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(worker.terminate());
            if (error) {
                await terminate();
                throw error;
            }
            const { args, transferable } = wrapArgs(req.args, Promise.resolve(worker));
            req.args = args;
            await safeRemoteCall(worker, req, transferable);
        }
    }
    else {
        const record = await poolRecord.getWorker;
        const worker = record.worker;
        workerId = record.workerId;
        worker.onmessage = (ev) => handleMessage(ev.data);
        worker.onerror = (ev) => {
            var _a;
            if (!error && !result) {
                worker.terminate(); // ensure termination
                handleClose((_a = fromErrorEvent(ev)) !== null && _a !== void 0 ? _a : new Error("worker exited"), true);
            }
        };
        release = () => {
            worker.onmessage = null;
            worker.onerror = null;
            poolRecord && (poolRecord.busy = false);
        };
        terminate = () => Promise.resolve(worker.terminate());
        if (error) {
            await terminate();
            throw error;
        }
        const { args, transferable } = wrapArgs(req.args, Promise.resolve(worker));
        req.args = args;
        await safeRemoteCall(worker, req, transferable);
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
            else {
                result = { value: void 0 };
            }
            await terminate();
            handleClose(null, true);
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
(function (run) {
    /**
     * The maximum number of workers allowed to exist at the same time. If not set, use the same
     * setting as {@link parallel.maxWorkers}.
     */
    run.maxWorkers = undefined;
})(run || (run = {}));
// backward compatibility
Object.defineProperties(run, {
    workerEntry: {
        set(v) {
            parallel.workerEntry = v;
        },
        get() {
            return parallel.workerEntry;
        },
    },
});
var run$1 = run;

export { run$1 as default };
//# sourceMappingURL=run.js.map
