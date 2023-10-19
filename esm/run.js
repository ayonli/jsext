import chan from './chan.js';
import deprecate from './deprecate.js';
import { fromObject } from './error/index.js';
import { isBeforeNode14, isNode, isBun, isChannelMessage, handleChannelMessage } from './util.js';
import parallel, { sanitizeModuleId, createCallRequest, createWorker, wrapArgs, isCallResponse } from './parallel.js';

let workerPool = [];
// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue = [];
async function run(script, args = undefined, options = undefined) {
    if (options === null || options === void 0 ? void 0 : options.workerEntry) {
        deprecate("options.workerEntry", run, "set `run.workerEntry` instead");
    }
    const modId = sanitizeModuleId(script);
    const msg = createCallRequest({
        script: modId,
        fn: (options === null || options === void 0 ? void 0 : options.fn) || "default",
        args: args !== null && args !== void 0 ? args : [],
    });
    const entry = (options === null || options === void 0 ? void 0 : options.workerEntry) || parallel.workerEntry;
    const adapter = (options === null || options === void 0 ? void 0 : options.adapter) || "worker_threads";
    const serialization = adapter === "worker_threads"
        ? "advanced"
        : ((options === null || options === void 0 ? void 0 : options.serialization) || (isBeforeNode14 ? "json" : "advanced"));
    let poolRecord = workerPool.find(item => {
        return item.adapter === adapter
            && item.serialization === serialization
            && !item.busy;
    });
    if (poolRecord) {
        poolRecord.busy = true;
    }
    else if (workerPool.length < parallel.maxWorkers) {
        // Fill the worker pool regardless the current call should keep-alive or not,
        // this will make sure that the total number of workers will not exceed the
        // `run.maxWorkers`. If the the call doesn't keep-alive the worker, it will be
        // cleaned after the call.
        workerPool.push(poolRecord = {
            getWorker: createWorker({ entry, adapter, serialization }),
            adapter,
            serialization,
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
    const timeout = (options === null || options === void 0 ? void 0 : options.timeout) ? setTimeout(() => {
        const err = new Error(`operation timeout after ${options.timeout}ms`);
        error = err;
        if (resolver) {
            resolver.reject(err);
        }
        terminate();
    }, options.timeout) : null;
    const handleMessage = (msg) => {
        var _a;
        if (isChannelMessage(msg)) {
            handleChannelMessage(msg);
        }
        else if (isCallResponse(msg)) {
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
                channel === null || channel === void 0 ? void 0 : channel.close();
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
        channel === null || channel === void 0 ? void 0 : channel.close(err);
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
        channel === null || channel === void 0 ? void 0 : channel.close(error);
    };
    if (isNode || isBun) {
        if (adapter === "child_process") {
            const record = await poolRecord.getWorker;
            const worker = record.worker;
            workerId = record.workerId;
            release = () => {
                worker.unref(); // allow the main thread to exit if the event loop is empty
                // Remove the event listener so that later calls will not mess up.
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));
            worker.ref(); // prevent premature exit in the main thread
            worker.on("message", handleMessage);
            worker.once("error", handleError);
            worker.once("exit", handleExit);
            if (error) {
                // The worker take too long to start and timeout error already thrown.
                await terminate();
                throw error;
            }
            const { args } = wrapArgs(msg.args, Promise.resolve(worker));
            msg.args = args;
            worker.send(msg);
        }
        else if (isNode) {
            const record = await poolRecord.getWorker;
            const worker = record.worker;
            workerId = record.workerId;
            release = () => {
                worker.unref();
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => void (await worker.terminate());
            worker.ref();
            worker.on("message", handleMessage);
            worker.once("error", handleError);
            worker.once("messageerror", handleError);
            worker.once("exit", handleExit);
            if (error) {
                await terminate();
                throw error;
            }
            const { args, transferable } = wrapArgs(msg.args, Promise.resolve(worker));
            msg.args = args;
            worker.postMessage(msg, transferable);
        }
        else { // isBun
            const record = await poolRecord.getWorker;
            const worker = record.worker;
            workerId = record.workerId;
            release = () => {
                worker.onmessage = null;
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => {
                await Promise.resolve(worker.terminate());
                handleExit();
            };
            worker.onmessage = (ev) => handleMessage(ev.data);
            worker.onerror = (ev) => handleMessage(ev.error || new Error(ev.message));
            worker.onmessageerror = () => {
                handleError(new Error("unable to deserialize the message"));
            };
            if (error) {
                await terminate();
                throw error;
            }
            const { args, transferable } = wrapArgs(msg.args, Promise.resolve(worker));
            msg.args = args;
            worker.postMessage(msg, transferable);
        }
    }
    else {
        const record = await poolRecord.getWorker;
        const worker = record.worker;
        workerId = record.workerId;
        release = () => {
            worker.onmessage = null;
            poolRecord && (poolRecord.busy = false);
        };
        terminate = async () => {
            await Promise.resolve(worker.terminate());
            handleExit();
        };
        worker.onmessage = (ev) => handleMessage(ev.data);
        worker.onerror = (ev) => handleMessage(ev.error || new Error(ev.message));
        worker.onmessageerror = () => {
            handleError(new Error("unable to deserialize the message"));
        };
        if (error) {
            await terminate();
            throw error;
        }
        const { args, transferable } = wrapArgs(msg.args, Promise.resolve(worker));
        msg.args = args;
        worker.postMessage(msg, transferable);
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
