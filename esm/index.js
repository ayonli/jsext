import { isAsyncGenerator as isAsyncGenerator_1, isGenerator as isGenerator_1 } from './_external/check-iterable/index.js';
import { sequence } from './number/index.js';

var _a;
const isNode = typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const throttleCaches = new Map();
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
 * Merges properties and methods only if they're missing in the class.
 */
function mergeIfNotExists(proto, source, mergeSuper = false) {
    let props = Reflect.ownKeys(source);
    for (let prop of props) {
        if (prop == "constructor") {
            continue;
        }
        else if (mergeSuper) {
            // When merging properties from super classes, the properties in the
            // base class has the first priority and shall not be overwrite.
            if (!(prop in proto)) {
                setProp(proto, source, prop);
            }
        }
        else if (!proto.hasOwnProperty(prop)) {
            setProp(proto, source, prop);
        }
    }
    return proto;
}
/**
 * Merges properties and methods across the prototype chain.
 */
function mergeHierarchy(ctor, mixin, mergeSuper = false) {
    mergeIfNotExists(ctor.prototype, mixin.prototype, mergeSuper);
    let _super = Object.getPrototypeOf(mixin);
    // Every user defined class or functions that can be instantiated have their
    // own names, if no name appears, that means the function has traveled to 
    // the root of the hierarchical tree.
    if (_super.name) {
        mergeHierarchy(ctor, _super, true);
    }
}
/**
 * Sets property for prototype based on the given source and prop name properly.
 */
function setProp(proto, source, prop) {
    let desc = Object.getOwnPropertyDescriptor(source, prop);
    if (desc) {
        Object.defineProperty(proto, prop, desc);
    }
    else {
        proto[prop] = source[prop];
    }
}
const jsext = {
    try(fn, ...args) {
        if (typeof fn === "function") {
            try {
                return jsext.try(fn.apply(void 0, args));
            }
            catch (err) {
                return [err, undefined];
            }
        }
        let returns = fn;
        // Implementation details should be ordered from complex to simple.
        if (isAsyncGenerator_1(returns)) {
            return (async function* () {
                let input;
                let result;
                // Use `while` loop instead of `for...of...` in order to
                // retrieve the return value of a generator function.
                while (true) {
                    try {
                        let { done, value } = await returns.next(input);
                        if (done) {
                            result = value;
                            break;
                        }
                        else {
                            // Receive any potential input value that passed
                            // to the outer `next()` call, and pass them to
                            // `res.next()` in the next call.
                            input = yield Promise.resolve([null, value]);
                        }
                    }
                    catch (err) {
                        // If any error occurs, yield that error as resolved
                        // and break the loop immediately, indicating the
                        // process is forced broken.
                        yield Promise.resolve([err, undefined]);
                        break;
                    }
                }
                return Promise.resolve([null, result]);
            })();
        }
        else if (isGenerator_1(returns)) {
            return (function* () {
                let input;
                let result;
                while (true) {
                    try {
                        let { done, value } = returns.next(input);
                        if (done) {
                            result = value;
                            break;
                        }
                        else {
                            input = yield [null, value];
                        }
                    }
                    catch (err) {
                        yield [err, undefined];
                        break;
                    }
                }
                return [null, result];
            })();
        }
        else if (typeof (returns === null || returns === void 0 ? void 0 : returns.then) === "function") {
            returns = returns.then((value) => [null, value]);
            return Promise.resolve(returns).catch((err) => [err, undefined]);
        }
        else {
            return [null, returns];
        }
    },
    func(fn) {
        return function (...args) {
            var _a;
            const callbacks = [];
            const defer = (cb) => void callbacks.push(cb);
            let result;
            try {
                const returns = fn.call(this, defer, ...args);
                if (isAsyncGenerator_1(returns)) {
                    const gen = (async function* () {
                        var _a;
                        let input;
                        // Use `while` loop instead of `for...of...` in order to
                        // retrieve the return value of a generator function.
                        while (true) {
                            try {
                                let { done, value } = await returns.next(input);
                                if (done) {
                                    result = { value, error: null };
                                    break;
                                }
                                else {
                                    // Receive any potential input value that passed
                                    // to the outer `next()` call, and pass them to
                                    // `res.next()` in the next call.
                                    input = yield Promise.resolve(value);
                                }
                            }
                            catch (error) {
                                // If any error occurs, capture that error and break
                                // the loop immediately, indicating the process is
                                // forced broken.
                                result = { value: void 0, error };
                                break;
                            }
                        }
                        for (let i = callbacks.length - 1; i >= 0; i--) {
                            await ((_a = callbacks[i]) === null || _a === void 0 ? void 0 : _a.call(callbacks));
                        }
                        if (result.error) {
                            throw result.error;
                        }
                        else {
                            return Promise.resolve(result.value);
                        }
                    })();
                    return gen;
                }
                else if (isGenerator_1(returns)) {
                    const gen = (function* () {
                        var _a;
                        let input;
                        while (true) {
                            try {
                                let { done, value } = returns.next(input);
                                if (done) {
                                    result = { value, error: null };
                                    break;
                                }
                                else {
                                    input = yield value;
                                }
                            }
                            catch (error) {
                                result = { value: void 0, error };
                                break;
                            }
                        }
                        for (let i = callbacks.length - 1; i >= 0; i--) {
                            (_a = callbacks[i]) === null || _a === void 0 ? void 0 : _a.call(callbacks);
                        }
                        if (result.error) {
                            throw result.error;
                        }
                        else {
                            return result.value;
                        }
                    })();
                    return gen;
                }
                else if (typeof (returns === null || returns === void 0 ? void 0 : returns.then) === "function") {
                    return Promise.resolve(returns).then(value => ({
                        value,
                        error: null,
                    })).catch((error) => ({
                        value: void 0,
                        error,
                    })).then(async (result) => {
                        var _a;
                        for (let i = callbacks.length - 1; i >= 0; i--) {
                            await ((_a = callbacks[i]) === null || _a === void 0 ? void 0 : _a.call(callbacks));
                        }
                        if (result.error) {
                            throw result.error;
                        }
                        else {
                            return result.value;
                        }
                    });
                }
                else {
                    result = { value: returns, error: null };
                }
            }
            catch (error) {
                result = { value: void 0, error };
            }
            for (let i = callbacks.length - 1; i >= 0; i--) {
                (_a = callbacks[i]) === null || _a === void 0 ? void 0 : _a.call(callbacks);
            }
            if (result.error) {
                throw result.error;
            }
            else {
                return result.value;
            }
        };
    },
    wrap(fn, wrapper) {
        const wrapped = function (...args) {
            return wrapper.call(this, fn, ...args);
        };
        Object.defineProperty(wrapped, "name", Object.getOwnPropertyDescriptor(fn, "name"));
        Object.defineProperty(wrapped, "length", Object.getOwnPropertyDescriptor(fn, "length"));
        Object.defineProperty(wrapped, "toString", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: fn.toString.bind(fn),
        });
        return wrapped;
    },
    throttle(handler, options) {
        const key = typeof options === "number" ? null : options.for;
        const duration = typeof options === "number" ? options : options.duration;
        const handleCall = function (cache, ...args) {
            var _a;
            if (cache.result && Date.now() < ((_a = cache.expires) !== null && _a !== void 0 ? _a : 0)) {
                if (cache.result.error) {
                    throw cache.result.error;
                }
                else {
                    return cache.result.value;
                }
            }
            try {
                const returns = handler.call(this, ...args);
                cache.result = { value: returns };
                cache.expires = Date.now() + duration;
                return returns;
            }
            catch (error) {
                cache.result = { error };
                cache.expires = Date.now() + duration;
                throw error;
            }
        };
        if (!key) {
            const cache = { for: null };
            return function (...args) {
                return handleCall.call(this, cache, ...args);
            };
        }
        else {
            let cache = throttleCaches.get(key);
            if (!cache) {
                cache = { for: key };
                throttleCaches.set(key, cache);
            }
            return function (...args) {
                return handleCall.call(this, cache, ...args);
            };
        }
    },
    mixins(base, ...mixins) {
        const obj = { ctor: null };
        obj.ctor = class extends base {
        }; // make sure this class has no name
        for (let mixin of mixins) {
            if (typeof mixin == "function") {
                mergeHierarchy(obj.ctor, mixin);
            }
            else if (mixin && typeof mixin == "object") {
                mergeIfNotExists(obj.ctor.prototype, mixin);
            }
            else {
                throw new TypeError("mixin must be a constructor or an object");
            }
        }
        return obj.ctor;
    },
    isSubclassOf(ctor1, ctor2) {
        return typeof ctor1 === "function"
            && typeof ctor2 === "function"
            && ctor1.prototype instanceof ctor2;
    },
    read(source, eventMap = undefined) {
        var _a;
        if (typeof source[Symbol.asyncIterator] === "function") {
            return source;
        }
        const iterable = {
            ended: false,
            error: null,
            queue: [],
            consumers: [],
            next() {
                return new Promise((resolve, reject) => {
                    if (this.error && !this.ended) {
                        // If there is error occurred during the last transmission and the iterator
                        // hasn't been closed, reject that error and stop the iterator immediately.
                        reject(this.error);
                        this.ended = true;
                    }
                    else if (this.ended && !this.queue.length) {
                        // If the iterator has is closed, resolve the pending consumer with void
                        // value.
                        resolve({ value: void 0, done: true });
                    }
                    else if (this.queue.length > 0) {
                        // If there are data in the queue, resolve the the first piece immediately.
                        resolve({ value: this.queue.shift(), done: false });
                    }
                    else {
                        // If there are no queued data, push the consumer to a waiting queue.
                        this.consumers.push({ resolve, reject });
                    }
                });
            }
        };
        const handleMessage = (data) => {
            var _a;
            if (iterable.consumers.length > 0) {
                (_a = iterable.consumers.shift()) === null || _a === void 0 ? void 0 : _a.resolve({ value: data, done: false });
            }
            else {
                iterable.queue.push(data);
            }
        };
        const handleClose = () => {
            iterable.ended = true;
            let consumer;
            while (consumer = iterable.consumers.shift()) {
                consumer.resolve({ value: undefined, done: true });
            }
        };
        const handleError = (err) => {
            iterable.error = err;
            if (iterable.consumers.length > 0) {
                iterable.consumers.forEach(item => {
                    item.reject(err);
                });
                iterable.consumers = [];
            }
        };
        const handleBrowserErrorEvent = (ev) => {
            let err;
            if (ev instanceof ErrorEvent) {
                err = ev.error || new Error(ev.message);
            }
            else {
                // @ts-ignore
                err = new Error("something went wrong", { cause: ev });
            }
            handleError(err);
        };
        const proto = Object.getPrototypeOf(source);
        const msgDesc = Object.getOwnPropertyDescriptor(proto, "onmessage");
        if ((msgDesc === null || msgDesc === void 0 ? void 0 : msgDesc.set) && typeof source.close === "function") { // WebSocket or EventSource
            const errDesc = Object.getOwnPropertyDescriptor(proto, "onerror");
            const closeDesc = Object.getOwnPropertyDescriptor(proto, "onclose");
            let cleanup;
            if ((eventMap === null || eventMap === void 0 ? void 0 : eventMap.event) &&
                (eventMap === null || eventMap === void 0 ? void 0 : eventMap.event) !== "message" &&
                typeof source["addEventListener"] === "function") { // for EventSource listening on custom events
                const es = source;
                const eventName = eventMap.event;
                const msgListener = (ev) => {
                    handleMessage(ev.data);
                };
                es.addEventListener(eventName, msgListener);
                cleanup = () => {
                    es.removeEventListener(eventName, msgListener);
                };
            }
            else {
                msgDesc.set.call(source, (ev) => {
                    handleMessage(ev.data);
                });
                cleanup = () => {
                    var _a;
                    (_a = msgDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, null);
                };
            }
            (_a = errDesc === null || errDesc === void 0 ? void 0 : errDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, handleBrowserErrorEvent);
            if (closeDesc === null || closeDesc === void 0 ? void 0 : closeDesc.set) { // WebSocket
                closeDesc.set.call(source, () => {
                    var _a, _b;
                    handleClose();
                    (_a = closeDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, null);
                    (_b = errDesc === null || errDesc === void 0 ? void 0 : errDesc.set) === null || _b === void 0 ? void 0 : _b.call(source, null);
                    cleanup === null || cleanup === void 0 ? void 0 : cleanup();
                });
            }
            else if (!(closeDesc === null || closeDesc === void 0 ? void 0 : closeDesc.set) && typeof source.close === "function") { // EventSource
                // EventSource by default does not trigger close event, we need to make sure when
                // it calls the close() function, the iterator is automatically closed.
                const es = source;
                const _close = es.close;
                es.close = function close() {
                    var _a;
                    _close.call(es);
                    handleClose();
                    es.close = _close;
                    (_a = errDesc === null || errDesc === void 0 ? void 0 : errDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, null);
                    cleanup === null || cleanup === void 0 ? void 0 : cleanup();
                };
            }
        }
        else if (typeof source.send === "function" && typeof source.close === "function") {
            // non-standard WebSocket implementation
            const ws = source;
            ws.onmessage = (ev) => {
                handleMessage(ev.data);
            };
            ws.onerror = handleBrowserErrorEvent;
            ws.onclose = () => {
                handleClose();
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
            };
        }
        else if (typeof source["addEventListener"] === "function") { // EventTarget
            const target = source;
            const msgEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.message) || "message";
            const errEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.error) || "error";
            const closeEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.close) || "close";
            const msgListener = (ev) => {
                if (ev instanceof MessageEvent) {
                    handleMessage(ev.data);
                }
            };
            target.addEventListener(msgEvent, msgListener);
            target.addEventListener(errEvent, handleBrowserErrorEvent);
            target.addEventListener(closeEvent, function closeListener() {
                handleClose();
                target.removeEventListener(closeEvent, closeListener);
                target.removeEventListener(msgEvent, msgListener);
                target.removeEventListener(errEvent, handleBrowserErrorEvent);
            });
        }
        else if (typeof source["on"] === "function") { // EventEmitter
            const target = source;
            const dataEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.data) || "data";
            const errEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.error) || "error";
            const endEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.close) || "close";
            target.on(dataEvent, handleMessage);
            target.once(errEvent, handleError);
            target.once(endEvent, () => {
                handleClose();
                target.off(dataEvent, handleMessage);
                target.off(dataEvent, handleError);
            });
        }
        else {
            throw new TypeError("the input source cannot be read as an AsyncIterable object");
        }
        return {
            [Symbol.asyncIterator]() {
                return iterable;
            }
        };
    },
    async run(script, args = undefined, options = undefined) {
        var _a;
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
        let timeout = (options === null || options === void 0 ? void 0 : options.timeout) ? setTimeout(() => {
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
                            iterator.emit("data", msg.value);
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
                iterator.emit("error", err);
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
                iterator.emit("close");
            }
            else if (!error && !result) {
                result = { value: void 0 };
            }
        };
        if (isNode) {
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            let _filename;
            let _dirname;
            let entry;
            if (typeof __filename === "string") {
                _filename = __filename;
                _dirname = __dirname;
            }
            else {
                // This file URL will be replace with `import.meta.url` by Rollup plugin.
                _filename = fileURLToPath(import.meta.url);
                _dirname = path.dirname(_filename);
            }
            if (["cjs", "esm"].includes(path.basename(_dirname))) { // compiled
                entry = path.join(path.dirname(_dirname), "worker.mjs");
            }
            else {
                entry = path.join(_dirname, "worker.mjs");
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
                    }).then(() => jsext.run(script, args, options));
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
                    workerId = worker.threadId;
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
                    }).then(() => jsext.run(script, args, options));
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
                    const _url = (options === null || options === void 0 ? void 0 : options.webWorkerEntry)
                        || "https://raw.githubusercontent.com/ayonli/jsext/main/esm/worker-web.mjs";
                    const res = await fetch(_url);
                    let blob;
                    if ((_a = res.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.startsWith("application/javascript")) {
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
                }).then(() => jsext.run(script, args, options));
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
                for await (const msg of jsext.read(iterator)) {
                    yield msg;
                }
            },
        };
    }
};

export { jsext as default };
//# sourceMappingURL=index.js.map
