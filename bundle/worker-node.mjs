import { isMainThread as isMainThread$1, parentPort } from 'worker_threads';

/** Returns `true` if the given value is a float number, `false` otherwise. */
/** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
function* sequence(min, max, step = 1, loop = false) {
    let id = min;
    while (true) {
        yield id;
        if ((id += step) > max) {
            if (loop) {
                id = min;
            }
            else {
                break;
            }
        }
    }
}

var _a$1;
if (typeof Symbol.dispose === "undefined") {
    Object.defineProperty(Symbol, "dispose", { value: Symbol("Symbol.dispose") });
}
const idGenerator = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const id = Symbol.for("id");
class Channel {
    constructor(capacity = 0) {
        this[_a$1] = idGenerator.next().value;
        this.buffer = [];
        this.producers = [];
        this.consumers = [];
        this.error = null;
        this.state = 1;
        if (capacity < 0) {
            throw new RangeError("the capacity of a channel must not be negative");
        }
        this.capacity = capacity;
    }
    /**
     * Pushes data to the channel.
     *
     * If there is a receiver, the data will be consumed immediately. Otherwise:
     *
     * - If this is an non-buffered channel, this function will block until a
     *  receiver is available and the data is consumed.
     *
     * - If this is a buffered channel, then:
     *      - If the buffer size is within the capacity, the data will be pushed
     *        to the buffer.
     *      - Otherwise, this function will block until there is new space for
     *        the data in the buffer.
     */
    send(data) {
        if (this.state !== 1) {
            throw new Error("the channel is closed");
        }
        else if (this.consumers.length) {
            const consume = this.consumers.shift();
            return Promise.resolve(consume(null, data));
        }
        else if (this.capacity && this.buffer.length < this.capacity) {
            this.buffer.push(data);
            return Promise.resolve(undefined);
        }
        else {
            return new Promise(resolve => {
                this.producers.push(() => {
                    if (this.capacity) {
                        const _data = this.buffer.shift();
                        this.buffer.push(data);
                        resolve();
                        return _data;
                    }
                    else {
                        resolve();
                        return data;
                    }
                });
            });
        }
    }
    /**
     * Retrieves data from the channel.
     *
     * If there isn't data available at the moment, this function will block
     * until new data is available.
     *
     * If the channel is closed, then:
     *
     * - If there is error set in the channel, this function throws that error
     *   immediately.
     * - Otherwise, this function returns `undefined` immediately.
     */
    recv() {
        if (this.buffer.length) {
            const data = this.buffer.shift();
            if (this.state === 2 && !this.buffer.length) {
                this.state = 0;
            }
            return Promise.resolve(data);
        }
        else if (this.producers.length) {
            const produce = this.producers.shift();
            if (this.state === 2 && !this.producers.length) {
                this.state = 0;
            }
            return Promise.resolve(produce());
        }
        else if (this.state === 0) {
            return Promise.resolve(undefined);
        }
        else if (this.error) {
            // Error can only be consumed once, after that, that closure will
            // be complete.
            const { error } = this;
            this.state = 0;
            this.error = null;
            return Promise.reject(error);
        }
        else if (this.state === 2) {
            this.state = 0;
            return Promise.resolve(undefined);
        }
        else {
            return new Promise((resolve, reject) => {
                this.consumers.push((err, data) => {
                    if (this.state === 2 && !this.consumers.length) {
                        this.state = 0;
                    }
                    err ? reject(err) : resolve(data);
                });
            });
        }
    }
    /**
     * Closes the channel. If `err` is supplied, it will be captured by the
     * receiver.
     *
     * No more data shall be sent once the channel is closed.
     *
     * Explicitly closing the channel is not required, if the channel is no
     * longer used, it will be automatically released by the GC. However, if
     * the channel is used in a `for await...of...` loop, closing the channel
     * will allow the loop to break automatically.
     *
     * Moreover, if the channel is used between parallel threads, it will no
     * longer be able to release automatically, must explicitly call this
     * function in order to release for GC.
     */
    close(err = null) {
        if (this.state !== 1) {
            // prevent duplicated call
            return;
        }
        this.state = 2;
        this.error = err;
        let consume;
        while (consume = this.consumers.shift()) {
            consume(err, undefined);
        }
    }
    [(_a$1 = id, Symbol.asyncIterator)]() {
        const channel = this;
        return {
            async next() {
                const bufSize = channel.buffer.length;
                const queueSize = channel.producers.length;
                const value = await channel.recv();
                return {
                    value: value,
                    done: channel.state === 0 && !bufSize && !queueSize,
                };
            }
        };
    }
    [Symbol.dispose]() {
        this.close();
    }
    /** @deprecated This method is deprecated in favor of the `send()` method. */
    push(data) {
        return this.send(data);
    }
    /** @deprecated This method is deprecated in favor of the `recv()` method. */
    pop() {
        return this.recv();
    }
}

var _a;
const isDeno = typeof Deno === "object";
const isBun = typeof Bun === "object";
const isNode = !isDeno && !isBun
    && typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
isNode && parseInt(process.version.slice(1)) < 14;
// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker.
const isNodeWorkerThread = isNode && process.argv.includes("--worker-thread");
const isMainThread = !isNodeWorkerThread
    && (isBun ? Bun.isMainThread : typeof WorkerGlobalScope === "undefined");
const moduleCache = new Map();
const channelStore = new Map();
async function resolveModule(modId, baseUrl = undefined) {
    let module;
    if (isNode || isBun) {
        const { fileURLToPath } = await import('url');
        const path = baseUrl ? fileURLToPath(new URL(modId, baseUrl).href) : modId;
        module = await import(path);
    }
    else {
        const url = new URL(modId, baseUrl).href;
        module = moduleCache.get(url);
        if (!module) {
            if (isDeno) {
                module = await import(url);
                moduleCache.set(url, module);
            }
            else {
                try {
                    module = await import(url);
                    moduleCache.set(url, module);
                }
                catch (err) {
                    if (String(err).includes("Failed")) {
                        // The content-type of the response isn't application/javascript, try to
                        // download it and load it with object URL.
                        const res = await fetch(url);
                        const buf = await res.arrayBuffer();
                        const blob = new Blob([new Uint8Array(buf)], {
                            type: "application/javascript",
                        });
                        const _url = URL.createObjectURL(blob);
                        module = await import(_url);
                        moduleCache.set(url, module);
                    }
                    else {
                        throw err;
                    }
                }
            }
        }
    }
    if (typeof module["default"] === "object" && typeof module["default"].default !== "undefined") {
        module = module["default"]; // CommonJS module with exports.default
    }
    return module;
}
function isChannelMessage(msg) {
    return msg
        && typeof msg === "object"
        && ["send", "close"].includes(msg.type)
        && typeof msg.channelId === "number";
}
async function handleChannelMessage(msg) {
    const record = channelStore.get(msg.channelId);
    if (!record)
        return;
    if (msg.type === "send") {
        await record.raw.send(msg.value);
    }
    else if (msg.type === "close") {
        const { value: err, channelId } = msg;
        record.raw.close(err);
        channelStore.delete(channelId);
        if (isMainThread && record.writers.length > 1) {
            // distribute the channel close event to all threads
            record.writers.forEach(write => {
                write("close", err, channelId);
            });
        }
    }
}
function wireChannel(channel, channelWrite) {
    const channelId = channel[id];
    if (!channelStore.has(channelId)) {
        const send = channel.send.bind(channel);
        const close = channel.close.bind(channel);
        channelStore.set(channelId, {
            channel,
            raw: { send, close },
            writers: [channelWrite],
            counter: 0,
        });
        Object.defineProperties(channel, {
            send: {
                configurable: true,
                writable: true,
                value: async (data) => {
                    const record = channelStore.get(channelId);
                    if (record) {
                        const channel = record.channel;
                        if (channel["state"] !== 1) {
                            throw new Error("the channel is closed");
                        }
                        const write = record.writers[record.counter++ % record.writers.length];
                        await Promise.resolve(write("send", data, channelId));
                    }
                },
            },
            close: {
                configurable: true,
                writable: true,
                value: (err = null) => {
                    const record = channelStore.get(channelId);
                    if (record) {
                        channelStore.delete(channelId);
                        const channel = record.channel;
                        record.writers.forEach(write => {
                            write("close", err, channelId);
                        });
                        // recover to the original methods
                        Object.defineProperties(channel, {
                            send: {
                                configurable: true,
                                writable: true,
                                value: record.raw.send,
                            },
                            close: {
                                configurable: true,
                                writable: true,
                                value: record.raw.close,
                            },
                        });
                        channel.close(err);
                    }
                },
            },
        });
    }
    else {
        const record = channelStore.get(channelId);
        record.writers.push(channelWrite);
    }
}
function unwrapChannel(obj, channelWrite) {
    var _a, _b;
    const channelId = obj["@@id"];
    let channel = (_a = channelStore.get(channelId)) === null || _a === void 0 ? void 0 : _a.channel;
    if (!channel) {
        channel = Object.assign(Object.create(Channel.prototype), {
            [id]: channelId,
            capacity: (_b = obj.capacity) !== null && _b !== void 0 ? _b : 0,
            buffer: [],
            producers: [],
            consumers: [],
            error: null,
            state: 1,
        });
    }
    wireChannel(channel, channelWrite);
    return channel;
}

if (!Symbol.asyncIterator) {
    // @ts-ignore
    Symbol.asyncIterator = Symbol("Symbol.asyncIterator");
}

/**
 * Checks if the given object is an IteratorLike (implemented `next`).
 * @param {any} obj
 * @returns {obj is { [x: string | symbol]: any; next: Function }}
 */
function isIteratorLike(obj) {
    // An iterable object has a 'next' method, however including a 'next' method
    // doesn't ensure the object is an iterator, it is only iterator-like.
    return typeof obj === "object"
        && obj !== null
        && typeof obj.next === "function";
}

/**
 * Checks if the given object is an IterableIterator (implemented both
 * `@@iterator` and `next`).
 * @param {any} obj
 */
function isIterableIterator(obj) {
    return isIteratorLike(obj)
        && typeof obj[Symbol.iterator] === "function";
}

/**
 * Checks if the given object is an AsyncIterableIterator (implemented
 * both `@@asyncIterator` and `next`).
 * @param {any} obj
 * @returns {obj is AsyncIterableIterator<any>}
 */
function isAsyncIterableIterator(obj) {
    return isIteratorLike(obj)
        && typeof obj[Symbol.asyncIterator] === "function";
}

/**
 * Checks if the given object is a Generator.
 * @param {any} obj
 * @returns {obj is Generator}
 */
function isGenerator(obj) {
    return isIterableIterator(obj)
        && hasGeneratorSpecials(obj);
}

/**
 * Checks if the given object is an AsyncGenerator.
 * @param {any} obj
 * @returns {obj is AsyncGenerator}
 */
function isAsyncGenerator(obj) {
    return isAsyncIterableIterator(obj)
        && hasGeneratorSpecials(obj);
}

/**
 * @param {any} obj 
 */
function hasGeneratorSpecials(obj) {
    return typeof obj.return === "function"
        && typeof obj.throw === "function";
}

/**
 * Returns `true` if the specified object has the indicated property as its own property.
 * If the property is inherited, or does not exist, the function returns `false`.
 */
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function pick(obj, keys) {
    return keys.reduce((result, key) => {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key];
        }
        return result;
    }, {});
}
function omit(obj, keys) {
    const allKeys = Reflect.ownKeys(obj);
    const keptKeys = allKeys.filter(key => !keys.includes(key));
    const result = pick(obj, keptKeys);
    // special treatment for Error types
    if (obj instanceof Error) {
        ["name", "message", "stack", "cause"].forEach(key => {
            if (!keys.includes(key) &&
                obj[key] !== undefined &&
                !hasOwn(result, key)) {
                result[key] = obj[key];
            }
        });
    }
    return result;
}
/**
 * Returns `true` is the given value is a plain object, that is, an object created by
 * the `Object` constructor or one with a `[[Prototype]]` of `null`.
 */
function isPlainObject(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto.constructor === Object;
}

class Exception extends Error {
    constructor(message, options = 0) {
        super(message);
        this.code = 0;
        if (typeof options === "number") {
            this.code = options;
        }
        else if (typeof options === "string") {
            Object.defineProperty(this, "name", {
                configurable: true,
                enumerable: false,
                writable: true,
                value: options,
            });
        }
        else {
            if (options.name) {
                Object.defineProperty(this, "name", {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: options.name,
                });
            }
            if (options.cause) {
                Object.defineProperty(this, "cause", {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: options.cause,
                });
            }
            if (options.code) {
                this.code = options.code;
            }
        }
    }
}
Object.defineProperty(Exception.prototype, "name", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: "Exception",
});

/** Transform the error to a plain object. */
function toObject(err) {
    if (!(err instanceof Error) && err["name"] && err["message"]) { // Error-like
        err = fromObject(err, Error);
    }
    const obj = {
        "@@type": err.constructor.name,
        ...omit(err, ["toString", "toJSON", "__callSiteEvals"]),
    };
    if (obj["@@type"] === "AggregateError" && Array.isArray(obj["errors"])) {
        obj["errors"] = obj["errors"].map(item => {
            return item instanceof Error ? toObject(item) : item;
        });
    }
    return obj;
}
function fromObject(obj, ctor = undefined) {
    var _a, _b;
    // @ts-ignore
    if (!(obj === null || obj === void 0 ? void 0 : obj.name)) {
        return null;
    }
    // @ts-ignore
    ctor || (ctor = (globalThis[obj["@@type"] || obj.name] || globalThis[obj.name]));
    if (!ctor) {
        if (obj["@@type"] === "Exception") {
            ctor = Exception;
        }
        else {
            ctor = Error;
        }
    }
    let err;
    if (ctor.name === "DOMException" && typeof DOMException === "function") {
        err = new ctor((_a = obj["message"]) !== null && _a !== void 0 ? _a : "", obj["name"]);
    }
    else {
        err = Object.create(ctor.prototype, {
            message: {
                configurable: true,
                enumerable: false,
                writable: true,
                value: (_b = obj["message"]) !== null && _b !== void 0 ? _b : "",
            },
        });
    }
    if (err.name !== obj["name"]) {
        Object.defineProperty(err, "name", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["name"],
        });
    }
    if (obj["stack"] !== undefined) {
        Object.defineProperty(err, "stack", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["stack"],
        });
    }
    if (obj["cause"] != undefined) {
        Object.defineProperty(err, "cause", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["cause"],
        });
    }
    const otherKeys = Reflect.ownKeys(obj).filter(key => ![
        "@@type",
        "name",
        "message",
        "stack",
        "cause"
    ].includes(key));
    otherKeys.forEach(key => {
        var _a;
        // @ts-ignore
        (_a = err[key]) !== null && _a !== void 0 ? _a : (err[key] = obj[key]);
    });
    // @ts-ignore
    if (isAggregateError(err) && Array.isArray(err["errors"])) {
        err["errors"] = err["errors"].map(item => {
            return isPlainObject(item) ? fromObject(item) : item;
        });
    }
    return err;
}
/** @inner */
function isDOMException(value) {
    return ((typeof DOMException === "function") && (value instanceof DOMException))
        || (value instanceof Error && value.constructor.name === "DOMException"); // Node.js v16-
}
/** @inner */
function isAggregateError(value) {
    // @ts-ignore
    return (typeof AggregateError === "function" && value instanceof AggregateError)
        || (value instanceof Error && value.constructor.name === "AggregateError");
}

const pendingTasks = new Map();
/**
 * For some reason, in Node.js and Bun, when import expression throws an
 * module/package not found error, the error can not be serialized and sent to
 * the other thread properly. We need to check this situation and sent the error
 * as plain object instead.
 */
function isModuleResolveError(value) {
    var _a;
    if (typeof value === "object" &&
        typeof (value === null || value === void 0 ? void 0 : value.message) === "string" &&
        /Cannot find (module|package)/.test(value === null || value === void 0 ? void 0 : value.message)) {
        return (value instanceof Error) // Node.js (possibly bug)
            || ((_a = value.constructor) === null || _a === void 0 ? void 0 : _a.name) === "Error"; // Bun (doesn't inherit from Error)
    }
    return false;
}
function removeUnserializableProperties(obj) {
    const _obj = {};
    for (const key of Reflect.ownKeys(obj)) {
        if (typeof obj[key] !== "bigint" && typeof obj[key] !== "function") {
            _obj[key] = obj[key];
        }
    }
    return _obj;
}
function unwrapArgs(args, channelWrite) {
    return args.map(arg => {
        if (isPlainObject(arg)) {
            if (arg["@@type"] === "Channel" && typeof arg["@@id"] === "number") {
                return unwrapChannel(arg, channelWrite);
            }
            else if (arg["@@type"] === "Exception"
                || arg["@@type"] === "DOMException"
                || arg["@@type"] === "AggregateError") {
                return fromObject(arg);
            }
        }
        return arg;
    });
}
function wrapReturnValue(value) {
    const transferable = [];
    if (value instanceof ArrayBuffer) {
        transferable.push(value);
    }
    else if ((value instanceof Exception)
        || isDOMException(value)
        || isAggregateError(value)
        || isModuleResolveError(value)) {
        value = toObject(value);
    }
    else if (isPlainObject(value)) {
        for (const key of Object.getOwnPropertyNames(value)) {
            const _value = value[key];
            if (_value instanceof ArrayBuffer) {
                transferable.push(_value);
            }
            else if ((_value instanceof Exception)
                || isDOMException(_value)
                || isAggregateError(_value)
                || isModuleResolveError(_value)) {
                value[key] = toObject(_value);
            }
        }
    }
    else if (Array.isArray(value)) {
        value = value.map(item => {
            if (item instanceof ArrayBuffer) {
                transferable.push(item);
                return item;
            }
            else if ((item instanceof Exception)
                || isDOMException(item)
                || isAggregateError(item)
                || isModuleResolveError(item)) {
                return toObject(item);
            }
            else {
                return item;
            }
        });
    }
    return { value, transferable };
}
function isCallRequest(msg) {
    return msg && typeof msg === "object"
        && ((msg.type === "call" && typeof msg.module === "string" && typeof msg.fn === "string") ||
            (["next", "return", "throw"].includes(msg.type) && typeof msg.taskId === "number"))
        && Array.isArray(msg.args);
}
async function handleCallRequest(msg, reply) {
    const _reply = reply;
    reply = (res) => {
        if (res.type === "error") {
            if ((res.error instanceof Exception) ||
                isDOMException(res.error) ||
                isAggregateError(res.error) ||
                isModuleResolveError(res.error)) {
                return _reply({
                    ...res,
                    error: removeUnserializableProperties(toObject(res.error)),
                });
            }
            try {
                return _reply(res);
            }
            catch (_a) {
                // In case the error cannot be cloned directly, fallback to
                // transferring it as an object and rebuild in the main thread.
                return _reply({
                    ...res,
                    error: removeUnserializableProperties(toObject(res.error)),
                });
            }
        }
        else {
            return _reply(res);
        }
    };
    msg.args = unwrapArgs(msg.args, (type, msg, channelId) => {
        reply({ type, value: msg, channelId });
    });
    try {
        if (msg.taskId && ["next", "return", "throw"].includes(msg.type)) {
            const req = msg;
            const task = pendingTasks.get(req.taskId);
            if (task) {
                if (req.type === "throw") {
                    try {
                        await task.throw(req.args[0]);
                    }
                    catch (error) {
                        reply({ type: "error", error, taskId: req.taskId });
                    }
                }
                else if (req.type === "return") {
                    try {
                        const res = await task.return(req.args[0]);
                        const { value, transferable } = wrapReturnValue(res.value);
                        reply({
                            type: "yield",
                            value,
                            done: res.done,
                            taskId: req.taskId,
                        }, transferable);
                    }
                    catch (error) {
                        reply({ type: "error", error, taskId: req.taskId });
                    }
                }
                else { // req.type === "next"
                    try {
                        const res = await task.next(req.args[0]);
                        const { value, transferable } = wrapReturnValue(res.value);
                        reply({
                            type: "yield",
                            value,
                            done: res.done,
                            taskId: req.taskId,
                        }, transferable);
                    }
                    catch (error) {
                        reply({ type: "error", error, taskId: req.taskId });
                    }
                }
            }
            else {
                reply({
                    type: "error",
                    error: new ReferenceError(`task (${req.taskId}) doesn't exists`),
                    taskId: req.taskId,
                });
            }
            return;
        }
        const req = msg;
        const module = await resolveModule(req.module);
        const returns = await module[req.fn](...req.args);
        if (isAsyncGenerator(returns) || isGenerator(returns)) {
            if (req.taskId) {
                pendingTasks.set(req.taskId, returns);
                reply({ type: "gen", taskId: req.taskId });
            }
            else {
                while (true) {
                    try {
                        const res = await returns.next();
                        const { value, transferable } = wrapReturnValue(res.value);
                        reply({ type: "yield", value, done: res.done }, transferable);
                        if (res.done) {
                            break;
                        }
                    }
                    catch (error) {
                        reply({ type: "error", error });
                        break;
                    }
                }
            }
        }
        else {
            const { value, transferable } = wrapReturnValue(returns);
            reply({ type: "return", value, taskId: req.taskId }, transferable);
        }
    }
    catch (error) {
        reply({ type: "error", error, taskId: msg.taskId });
    }
}
if (isBun
    && Bun.isMainThread
    && typeof process === "object"
    && typeof process.send === "function") { // Bun with child_process
    process.send("ready"); // notify the parent process that the worker is ready;
    process.on("message", async (msg) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, (res, _ = []) => {
                process.send(res);
            });
        }
        else if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        }
    });
}
else if (!isNode && typeof self === "object") {
    self.onmessage = async ({ data: msg }) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, (res, transferable = []) => {
                self.postMessage(res, { transfer: transferable });
            });
        }
        else if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        }
    };
}

if (isNode) {
    if (!isMainThread$1 && parentPort) {
        parentPort.on("message", async (msg) => {
            if (isCallRequest(msg)) {
                await handleCallRequest(msg, (res, transferable = []) => {
                    parentPort.postMessage(res, transferable);
                });
            }
            else if (isChannelMessage(msg)) {
                await handleChannelMessage(msg);
            }
        });
    }
    else if (process.send) {
        // notify the parent process that the worker is ready;
        process.send("ready");
        process.on("message", async (msg) => {
            if (isCallRequest(msg)) {
                await handleCallRequest(msg, (res, _ = []) => {
                    process.send(res);
                });
            }
            else if (isChannelMessage(msg)) {
                await handleChannelMessage(msg);
            }
        });
    }
}
