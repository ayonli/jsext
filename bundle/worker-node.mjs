import { isMainThread, parentPort } from 'worker_threads';

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
     * - If this is an non-buffered channel, this function will block until a receiver is
     *  available and the data is consumed.
     *
     * - If this is a buffered channel, then:
     *      - If the buffer size is within the capacity, the data will be pushed to the buffer.
     *      - Otherwise, this function will block until there is new space for the data in the
     *          buffer.
     */
    push(data) {
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
     * If there isn't data available at the moment, this function will block until new data is
     * available.
     *
     * If the channel is closed, then:
     *
     * - If there is error set in the channel, this function throws that error immediately.
     * - Otherwise, this function returns `undefined` immediately.
     */
    pop() {
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
            // Error can only be consumed once, after that, that closure will be complete.
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
     * Closes the channel. If `err` is supplied, it will be captured by the receiver.
     *
     * No more data shall be sent once the channel is closed.
     *
     * Explicitly closing the channel is not required, if the channel is no longer used, it
     * will be automatically released by the GC. However, if the channel is used in a
     * `for await...of...` loop, closing the channel will allow the loop to break automatically.
     *
     * Moreover, if the channel is used between parallel threads, it will no longer be able to
     * release automatically, must explicitly call this function in order to release for GC.
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
                const value = await channel.pop();
                return {
                    value: value,
                    done: channel.state === 0 && !bufSize && !queueSize,
                };
            }
        };
    }
}

var _a;
const isDeno = typeof Deno === "object";
const isBun = typeof Bun === "object";
const isNode = !isDeno && !isBun && typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
isNode && parseInt(process.version.slice(1)) < 14;
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
        && ["push", "close"].includes(msg.type)
        && typeof msg.channelId === "number";
}
async function handleChannelMessage(msg) {
    const channel = channelStore.get(msg.channelId);
    if (!channel)
        return;
    if (msg.type === "push") {
        channel.raw.push(msg.value);
    }
    else if (msg.type === "close") {
        channel.raw.close(msg.value);
        channelStore.delete(msg.channelId);
    }
}
function unwrapChannel(obj, channelWrite) {
    var _a;
    const channelId = obj["@@id"];
    let record = channelStore.get(channelId);
    if (!record) {
        const channel = Object.assign(Object.create(Channel.prototype), {
            [id]: channelId,
            capacity: (_a = obj.capacity) !== null && _a !== void 0 ? _a : 0,
            buffer: [],
            producers: [],
            consumers: [],
            error: null,
            state: 1,
        });
        if (!channelStore.has(channelId)) {
            const push = channel.push.bind(channel);
            const close = channel.close.bind(channel);
            channelStore.set(channelId, record = { channel, raw: { push, close } });
        }
        Object.defineProperties(channel, {
            push: {
                configurable: true,
                writable: true,
                value: async (value) => {
                    if (channel["state"] !== 1) {
                        throw new Error("the channel is closed");
                    }
                    await Promise.resolve(channelWrite("push", value, channelId));
                },
            },
            close: {
                configurable: true,
                writable: true,
                value: (err = null) => {
                    const record = channelStore.get(channelId);
                    record === null || record === void 0 ? void 0 : record.raw.close(err);
                    channelWrite("close", err, channelId);
                    channelStore.delete(channelId);
                    if (record) {
                        // recover to the original methods
                        Object.defineProperties(channel, {
                            push: {
                                configurable: true,
                                writable: true,
                                value: record.raw.push,
                            },
                            close: {
                                configurable: true,
                                writable: true,
                                value: record.raw.close,
                            },
                        });
                    }
                },
            },
        });
    }
    return record.channel;
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
        ["name", "message", "cause"].forEach(key => {
            if (!keys.includes(key) &&
                obj[key] !== undefined &&
                !hasOwn(result, key)) {
                result[key] = obj[key];
            }
        });
    }
    return result;
}

class Exception extends Error {
    constructor(message, options = 0) {
        super(message);
        this.code = 0;
        if (typeof options === "number") {
            this.code = options;
        }
        else {
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
    return omit(err, ["toString", "toJSON"]);
}
function fromObject(obj, ctor = undefined) {
    var _a, _b;
    // @ts-ignore
    if (!(obj === null || obj === void 0 ? void 0 : obj.name)) {
        return null;
    }
    // @ts-ignore
    ctor || (ctor = globalThis[obj.name]);
    if (!ctor) {
        if (obj["name"] === "Exception") {
            ctor = Exception;
        }
        else {
            ctor = Error;
        }
    }
    let err;
    if (ctor.name === "DOMException") {
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
    const otherKeys = Reflect.ownKeys(obj).filter(key => !["name", "message", "stack", "cause"].includes(key));
    otherKeys.forEach(key => {
        var _a;
        // @ts-ignore
        (_a = err[key]) !== null && _a !== void 0 ? _a : (err[key] = obj[key]);
    });
    return err;
}

const pendingTasks = new Map();
function unwrapArgs(args, channelWrite) {
    return args.map(arg => {
        if (typeof arg === "object" && arg &&
            (!arg.constructor || arg.constructor === Object) &&
            arg["@@type"] === "Channel" &&
            typeof arg["@@id"] === "number") {
            return unwrapChannel(arg, channelWrite);
        }
        else {
            return arg;
        }
    });
}
function isCallRequest(msg) {
    return msg && typeof msg === "object" &&
        ["call", "next", "return", "throw"].includes(msg.type) &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}
async function handleCallRequest(msg, reply) {
    const _reply = reply;
    reply = (res) => {
        if (res.type === "error") {
            if (isNode && process.argv.includes("--serialization=json")) {
                return _reply({
                    ...res,
                    error: toObject(res.error)
                });
            }
            if (typeof DOMException === "function" && res.error instanceof DOMException) {
                // DOMException cannot be cloned properly, fallback to transferring it as
                // an object and rebuild in the main thread.
                return _reply({
                    ...res,
                    error: {
                        ...toObject(res.error),
                        // In Node.js, the default name of DOMException is incorrect,
                        // we need to set it right.
                        name: "DOMException",
                    },
                });
            }
            try {
                return _reply(res);
            }
            catch (_a) {
                // In case the error cannot be cloned directly, fallback to transferring it as
                // an object and rebuild in the main thread.
                return _reply({
                    ...res,
                    error: toObject(res.error)
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
        if (msg.taskId) {
            const task = pendingTasks.get(msg.taskId);
            if (task) {
                if (msg.type === "throw") {
                    try {
                        await task.throw(msg.args[0]);
                    }
                    catch (error) {
                        reply({ type: "error", error, taskId: msg.taskId });
                    }
                }
                else if (msg.type === "return") {
                    try {
                        const res = await task.return(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    }
                    catch (error) {
                        reply({ type: "error", error, taskId: msg.taskId });
                    }
                }
                else if (msg.type === "next") {
                    try {
                        const res = await task.next(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    }
                    catch (error) {
                        reply({ type: "error", error, taskId: msg.taskId });
                    }
                }
                return;
            }
        }
        const module = await resolveModule(msg.script, msg.baseUrl);
        const returns = await module[msg.fn](...msg.args);
        if (isAsyncGenerator(returns) || isGenerator(returns)) {
            if (msg.taskId) {
                pendingTasks.set(msg.taskId, returns);
                reply({ type: "gen", taskId: msg.taskId });
            }
            else {
                while (true) {
                    try {
                        const { value, done } = await returns.next();
                        reply({ type: "yield", value, done });
                        if (done) {
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
            reply({ type: "return", value: returns, taskId: msg.taskId });
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
    const reply = process.send.bind(process);
    reply("ready"); // notify the parent process that the worker is ready;
    process.on("message", async (msg) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, reply);
        }
        else if (isChannelMessage(msg)) {
            handleChannelMessage(msg);
        }
    });
}
else if (!isNode && typeof self === "object") {
    const reply = self.postMessage.bind(self);
    self.onmessage = async ({ data: msg }) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, reply);
        }
        else if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        }
    };
}

if (isNode) {
    if (!isMainThread && parentPort) {
        const reply = parentPort.postMessage.bind(parentPort);
        parentPort.on("message", async (msg) => {
            if (isCallRequest(msg)) {
                await handleCallRequest(msg, reply);
            }
            else if (isChannelMessage(msg)) {
                handleChannelMessage(msg);
            }
        });
    }
    else if (process.send) {
        const reply = process.send.bind(process);
        reply("ready"); // notify the parent process that the worker is ready;
        process.on("message", async (msg) => {
            if (isCallRequest(msg)) {
                await handleCallRequest(msg, reply);
            }
            else if (isChannelMessage(msg)) {
                handleChannelMessage(msg);
            }
        });
    }
}
