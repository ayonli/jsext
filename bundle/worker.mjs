var _a$2;
const id = Symbol.for("id");
typeof ServiceWorkerGlobalScope === "function"
    && globalThis instanceof ServiceWorkerGlobalScope;
typeof SharedWorkerGlobalScope === "function"
    && globalThis instanceof SharedWorkerGlobalScope;
typeof DedicatedWorkerGlobalScope === "function"
    && globalThis instanceof DedicatedWorkerGlobalScope;
const isDeno = typeof Deno === "object" && typeof Deno.version === "object";
const isBun = typeof Bun === "object" && typeof Bun.version === "string";
const isNodeLike = typeof process === "object" && !!((_a$2 = process.versions) === null || _a$2 === void 0 ? void 0 : _a$2.node) && !isDeno;
const isNode = isNodeLike && !isDeno && !isBun;
isNode && parseInt(process.version.slice(1)) < 14;
isNode && parseInt(process.version.slice(1)) < 16;
isNode && parseInt(process.version.slice(1)) < 20;
const isNodeWorkerThread = isNode
    && (process.abort.disabled === true || process.argv.includes("--worker-thread"));
const isMainThread = !isNodeWorkerThread
    && (isBun ? Bun.isMainThread : typeof WorkerGlobalScope === "undefined");

/**
 * Functions for dealing with numbers.
 * @module
 */
/** Returns `true` if the given value is a float number, `false` otherwise. */
/**
 * Creates a generator that produces sequential numbers from `1` to
 * `Number.MAX_SAFE_INTEGER`, useful for generating unique IDs.
 *
 * @param loop Repeat the sequence when the end is reached.
 *
 * @example
 * ```ts
 * import { serial } from "@ayonli/jsext/number";
 *
 * const idGenerator = serial();
 *
 * console.log(idGenerator.next().value); // 1
 * console.log(idGenerator.next().value); // 2
 * console.log(idGenerator.next().value); // 3
 * ```
 */
function serial(loop = false) {
    return sequence(1, Number.MAX_SAFE_INTEGER, 1, loop);
}
/**
 * Creates a generator that produces sequential numbers from `min` to `max` (inclusive).
 * @inner
 */
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

/**
 * A channel implementation that transfers data across routines, even across
 * multiple threads, inspired by Golang.
 * @module
 */
var _a$1;
if (typeof Symbol.dispose === "undefined") {
    Object.defineProperty(Symbol, "dispose", { value: Symbol("Symbol.dispose") });
}
const idGenerator = serial(true);
/**
 * A channel implementation that transfers data across routines, even across
 * multiple threads, inspired by Golang.
 */
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
            throw new TypeError("the channel is closed");
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
}

const channelStore = new Map();
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
                            throw new TypeError("the channel is closed");
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
 * Utilities for encoding and decoding binary representations like hex and
 * base64 strings.
 * @module
 */
new TextEncoder();

/**
 * Functions for dealing with byte arrays (`Uint8Array`).
 * @module
 */
new TextEncoder();
new TextDecoder();

/**
 * This module includes functions for dealing with classes.
 * @module
 */
/**
 * Checks if a value is a class/constructor.
 *
 * @example
 * ```ts
 * import { isClass } from "@ayonli/jsext/class";
 *
 * console.assert(isClass(class Foo { }));
 * console.assert(!isClass(function foo() { }));
 * ```
 */
/**
 * Checks if a class is a subclass of another class.
 *
 * @example
 * ```ts
 * import { isSubclassOf } from "@ayonli/jsext/class";
 *
 * class Moment extends Date {}
 *
 * console.assert(isSubclassOf(Moment, Date));
 * console.assert(isSubclassOf(Moment, Object)); // all classes are subclasses of Object
 * ```
 */
function isSubclassOf(ctor1, ctor2) {
    return typeof ctor1 === "function"
        && typeof ctor2 === "function"
        && ctor1.prototype instanceof ctor2;
}

/**
 * Functions for dealing with objects.
 * @module
 */
/**
 * Returns `true` if the specified object has the indicated property as its own property.
 * If the property is inherited, or does not exist, the function returns `false`.
 *
 * @example
 * ```ts
 * import { hasOwn } from "@ayonli/jsext/object";
 *
 * const obj = { foo: "hello" };
 *
 * console.log(hasOwn(obj, "foo")); // true
 * console.log(hasOwn(obj, "toString")); // false
 * ```
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
 *
 * @example
 * ```ts
 * import { isPlainObject } from "@ayonli/jsext/object";
 *
 * console.log(isPlainObject({ foo: "bar" })); // true
 * console.log(isPlainObject(Object.create(null))); // true
 * console.log(isPlainObject(new Map([["foo", "bar"]]))); // false
 * ```
 */
function isPlainObject(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto.constructor === Object;
}

/**
 * A generic exception class, which can be used to represent any kind of error.
 * It's similar to the `DOMException`, but for any JavaScript environment.
 *
 * @example
 * ```ts
 * // throw an exception with a name
 * import { Exception } from "@ayonli/jsext/error";
 *
 * throw new Exception("Operation timeout after 5 seconds", "TimeoutError");
 * ```
 *
 * @example
 * ```ts
 * // throw an exception with a code (not recommended, always use a name or both)
 * import { Exception } from "@ayonli/jsext/error";
 *
 * throw new Exception("Operation timeout after 5 seconds", 408);
 * ```
 *
 * @example
 * ```ts
 * // throw an exception with a cause
 * import { Exception } from "@ayonli/jsext/error";
 *
 * try {
 *     throw new Error("Something went wrong");
 * } catch (error) {
 *     throw new Exception("An error occurred", { cause: error });
 * }
 * ```
 */
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
    get() {
        return this.constructor.name;
    },
});

/**
 * This module includes some common errors that can be used in the application.
 * @module
 */
/**
 * This error indicates that the requested operation, such as modifying a file,
 * is not allowed by the current user.
 *
 * NOTE: This error has an HTTP-compatible code of `403`.
 */
class NotAllowedError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NotAllowedError", code: 403 });
    }
}
/**
 * This error indicates that the requested resource, such as a file, is not
 * found.
 *
 * NOTE: This error has an HTTP-compatible code of `404`.
 */
class NotFoundError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NotFoundError", code: 404 });
    }
}
/**
 * This error indicates that the target resource path, such as a file, already
 * exists.
 *
 * NOTE: This error has an HTTP-compatible code of `409`.
 */
class AlreadyExistsError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "AlreadyExistsError", code: 409 });
    }
}
/**
 * This error indicates that the requested function or feature is not supported
 * by the current environment.
 *
 * NOTE: This error has an HTTP-compatible code of `405`.
 */
class NotSupportedError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NotSupportedError", code: 405 });
    }
}
/**
 * This error indicates that the requested operation, such as a function, is not
 * implemented.
 *
 * NOTE: This error has an HTTP-compatible code of `501`.
 *
 * NOTE: `NotImplementedError` should only be used for stubs or placeholders,
 * it should not be used to indicate the lack of support for a feature, in such
 * cases, use {@link NotSupportedError} instead.
 */
class NotImplementedError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NotImplementedError", code: 501 });
    }
}
/**
 * This error indicates that the requested operation, such as a network request,
 * is timed out.
 *
 * NOTE: This error has an HTTP-compatible code of `408`.
 */
class TimeoutError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "TimeoutError", code: 408 });
    }
}
/**
 * This error indicates that the connection between the client and the server
 * cannot be established.
 */
class NetworkError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NetworkError" });
    }
}

var common = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AlreadyExistsError: AlreadyExistsError,
    NetworkError: NetworkError,
    NotAllowedError: NotAllowedError,
    NotFoundError: NotFoundError,
    NotImplementedError: NotImplementedError,
    NotSupportedError: NotSupportedError,
    TimeoutError: TimeoutError
});

var _a;
if (typeof globalThis.Event !== "function") {
    // @ts-ignore
    globalThis.Event = (_a = class Event {
            constructor(type, eventInitDict = {}) {
                this.type = type;
                this.eventInitDict = eventInitDict;
                this.bubbles = false;
                this.cancelable = false;
                this.cancelBubble = false;
                this.composed = false;
                this.currentTarget = null;
                this.defaultPrevented = false;
                this.eventPhase = _a.NONE;
                this.isTrusted = false;
                this.returnValue = true;
                this.target = null;
                this.timeStamp = Date.now();
                this.srcElement = null;
                this.AT_TARGET = 2;
                this.BUBBLING_PHASE = 3;
                this.CAPTURING_PHASE = 1;
                this.NONE = 0;
                if (eventInitDict.bubbles !== undefined) {
                    this.bubbles = eventInitDict.bubbles;
                }
                if (eventInitDict.cancelable !== undefined) {
                    this.cancelable = eventInitDict.cancelable;
                }
                if (eventInitDict.composed !== undefined) {
                    this.composed = eventInitDict.composed;
                }
            }
            composedPath() {
                return [];
            }
            preventDefault() {
                if (this.cancelable) {
                    this.defaultPrevented = true;
                }
            }
            stopImmediatePropagation() {
                // Do nothing
            }
            stopPropagation() {
                this.cancelBubble = true;
            }
            initEvent(type, bubbles = undefined, cancelable = undefined) {
                this.type = type;
                this.bubbles = bubbles !== null && bubbles !== void 0 ? bubbles : false;
                this.cancelable = cancelable !== null && cancelable !== void 0 ? cancelable : false;
            }
        },
        _a.AT_TARGET = 2,
        _a.BUBBLING_PHASE = 3,
        _a.CAPTURING_PHASE = 1,
        _a.NONE = 0,
        _a);
}
if (typeof globalThis.EventTarget !== "function") {
    // @ts-ignore
    globalThis.EventTarget = class EventTarget {
        constructor() {
            this.listeners = {};
        }
        addEventListener(type, callback, options = {}) {
            var _b;
            if (!(type in this.listeners)) {
                this.listeners[type] = [];
            }
            // @ts-ignore
            this.listeners[type].push({ callback, once: (_b = options === null || options === void 0 ? void 0 : options.once) !== null && _b !== void 0 ? _b : false });
        }
        removeEventListener(type, callback) {
            if (!(type in this.listeners)) {
                return;
            }
            const stack = this.listeners[type];
            for (let i = 0, l = stack.length; i < l; i++) {
                if (stack[i].callback === callback) {
                    stack.splice(i, 1);
                    return;
                }
            }
            if (stack.length === 0) {
                delete this.listeners[type];
            }
        }
        dispatchEvent(event) {
            if (!(event.type in this.listeners)) {
                return true;
            }
            Object.defineProperties(event, {
                currentTarget: { configurable: true, value: this },
                target: { configurable: true, value: this },
            });
            const stack = this.listeners[event.type].slice();
            for (let i = 0, l = stack.length; i < l; i++) {
                const listener = stack[i];
                try {
                    listener.callback.call(this, event);
                }
                catch (err) {
                    setTimeout(() => {
                        throw err;
                    });
                }
                if (listener.once) {
                    this.removeEventListener(event.type, listener.callback);
                }
            }
            return !event.defaultPrevented;
        }
    };
}

/**
 * Functions for converting errors to/from other types of objects.
 * @module
 */
const errorTypeRegistry = new Map([
    ["Exception", Exception]
]);
/**
 * Registers an error constructor that can be used by {@link fromObject} to
 * reverse a plain object which is previously transformed by {@link toObject}
 * back to an error instance.
 * */
function registerErrorType(ctor) {
    errorTypeRegistry.set(ctor.name, ctor);
}
/**
 * Returns the error constructor by the `name`.
 * @inner
 */
function getErrorConstructor(name) {
    let type = errorTypeRegistry.get(name);
    if (!type && name in globalThis) {
        const value = globalThis[name];
        if (value === Error || isSubclassOf(value, Error) ||
            (typeof DOMException === "function" && value === DOMException)) {
            type = value;
        }
    }
    return type ? type : null;
}
const commonErrors = Object.values(common)
    .filter(value => isSubclassOf(value, Error));
commonErrors.forEach(ctor => registerErrorType(ctor));
/**
 * Transforms the error to a plain object so that it can be serialized to JSON
 * and later reversed back to an error instance using {@link fromObject}.
 *
 * @example
 * ```ts
 * import { toObject } from "@ayonli/jsext/error";
 *
 * const err = new Error("Something went wrong.");
 *
 * const obj = toObject(err);
 * console.log(obj);
 * // {
 * //     "@@type": "Error",
 * //     name: "Error",
 * //     message: "Something went wrong.",
 * //     stack: "Error: Something went wrong.\n    at <anonymous>:1:13"
 * // }
 * ```
 */
function toObject(err) {
    if (!(err instanceof Error) && err["name"] && err["message"]) { // Error-like
        err = fromObject(err, Error);
    }
    const obj = {
        "@@type": err.constructor.name,
        ...omit(err, ["toString", "toJSON", "__callSiteEvals"]),
    };
    if ("cause" in obj) {
        obj["cause"] = obj["cause"] instanceof Error ? toObject(obj["cause"]) : obj["cause"];
    }
    if (obj["@@type"] === "AggregateError" && Array.isArray(obj["errors"])) {
        obj["errors"] = obj["errors"].map(item => {
            return item instanceof Error ? toObject(item) : item;
        });
    }
    return obj;
}
function fromObject(obj, ctor = null, strict = false) {
    var _a, _b, _c, _d;
    // @ts-ignore
    if (!(obj === null || obj === void 0 ? void 0 : obj.name) || (strict && !obj["@@type"])) {
        return null;
    }
    // @ts-ignore
    const typeName = obj["@@type"] || obj.name;
    // @ts-ignore
    ctor !== null && ctor !== void 0 ? ctor : (ctor = ((_a = getErrorConstructor(typeName)) !== null && _a !== void 0 ? _a : Error));
    let err;
    if (ctor.name === "DOMException" && typeof DOMException === "function") {
        err = new ctor((_b = obj["message"]) !== null && _b !== void 0 ? _b : "", obj["name"]);
    }
    else {
        err = Object.create(ctor.prototype, {
            message: {
                configurable: true,
                enumerable: false,
                writable: true,
                value: (_c = obj["message"]) !== null && _c !== void 0 ? _c : "",
            },
        });
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
            value: isPlainObject(obj["cause"])
                ? ((_d = fromObject(obj["cause"], undefined, true)) !== null && _d !== void 0 ? _d : obj["cause"])
                : obj["cause"],
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

(() => {
    try {
        return new RegExp("^\(?:\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F)(?:\\u200d(?:\\p{Emoji_Modifier_Base}\\p{Emoji_Modifier}?|\\p{Emoji_Presentation}|\\p{Emoji}\\uFE0F))*$", "u");
    }
    catch (_a) {
        return new RegExp("^(\\u00a9|\\u00ae|[\\u25a0-\\u27bf]|\\ud83c[\\ud000-\\udfff]|\\ud83d[\\ud000-\\udfff]|\\ud83e[\\ud000-\\udfff])$");
    }
})();

/**
 * Functions for dealing with strings.
 * @module
 */
const _trim = String.prototype.trim;
const _trimEnd = String.prototype.trimEnd;
const _trimStart = String.prototype.trimStart;
/**
 * Removes leading and trailing spaces or custom characters of the string.
 *
 * @example
 * ```ts
 * import { trim } from "@ayonli/jsext/string";
 *
 * console.log(trim("  hello world  ")); // "hello world"
 * console.log(trim("  hello world!  ", " !")); // "hello world"
 * ```
 */
function trim(str, chars = "") {
    if (!chars) {
        return _trim.call(str);
    }
    else {
        return trimEnd(trimStart(str, chars), chars);
    }
}
/**
 * Removes trailing spaces or custom characters of the string.
 *
 * @example
 * ```ts
 * import { trimEnd } from "@ayonli/jsext/string";
 *
 * console.log(trimEnd("  hello world  ")); // "  hello world"
 * console.log(trimEnd("  hello world!  ", " !")); // "  hello world"
 * ```
 */
function trimEnd(str, chars = "") {
    if (!chars) {
        return _trimEnd.call(str);
    }
    else {
        let i = str.length;
        while (i-- && chars.indexOf(str[i]) !== -1) { }
        return str.substring(0, i + 1);
    }
}
/**
 * Removes leading spaces or custom characters of the string.
 *
 * @example
 * ```ts
 * import { trimStart } from "@ayonli/jsext/string";
 *
 * console.log(trimStart("  hello world  ")); // "hello world  "
 * console.log(trimStart("  !hello world!  ", " !")); // "hello world!  "
 * ```
 */
function trimStart(str, chars = "") {
    if (!chars) {
        return _trimStart.call(str);
    }
    else {
        let i = 0;
        do { } while (chars.indexOf(str[i]) !== -1 && ++i);
        return str.substring(i);
    }
}

function isVolume(path, strict = false) {
    return strict ? /^[a-zA-Z]:$/.test(path) : /^[a-zA-Z]:(\\)?$/.test(path);
}
/**
 * Checks if the given `path` is a Windows specific path.
 *
 * @example
 * ```ts
 * import { isWindowsPath } from "@ayonli/jsext/path";
 *
 * console.assert(isWindowsPath("C:\\Windows\\System32"));
 * console.assert(isWindowsPath("c:\\Windows\\System32")); // case-insensitive on volume
 * console.assert(isWindowsPath("D:/Program Files")); // forward slash is also valid
 * console.assert(isWindowsPath("E:")); // volume without path is also valid
 * ```
 */
function isWindowsPath(path) {
    return /^[a-zA-Z]:/.test(path) && path.slice(1, 4) !== "://";
}
/**
 * Checks if the given `path` is a Posix specific path.
 *
 * @example
 * ```ts
 * import { isPosixPath } from "@ayonli/jsext/path";
 *
 * console.assert(isPosixPath("/usr/bin"));
 * ```
 */
function isPosixPath(path) {
    return /^\//.test(path);
}
/**
 * Checks if the given `path` is a file system path.
 *
 * @example
 * ```ts
 * import { isFsPath } from "@ayonli/jsext/path";
 *
 * console.assert(isFsPath("/usr/bin"));
 * console.assert(isFsPath("C:\\Windows\\System32"));
 * console.assert(isFsPath("./foo/bar"));
 * console.assert(isFsPath("../foo/bar"));
 * ```
 */
function isFsPath(path) {
    return /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/.test(path);
}
/**
 * Checks if the given string is a URL, whether standard or non-standard.
 *
 * @example
 * ```ts
 * import { isUrl } from "@ayonli/jsext/path";
 *
 * console.assert(isUrl("http://example.com"));
 * console.assert(isUrl("https://example.com?foo=bar#baz"));
 * console.assert(isUrl("ftp://example.com")); // ftp url
 * console.assert(isUrl("file:///C:/Windows/System32")); // file url
 * console.assert(isUrl("file://localhost/C:/Windows/System32")); // file url with hostname
 * console.assert(isUrl("file:///usr/bin"));
 * ```
 */
function isUrl(str) {
    return /^[a-z](([a-z\-]+)?:\/\/\S+|[a-z\-]+:\/\/$)/i.test(str) || isFileUrl(str);
}
/**
 * Checks if the given string or {@link URL} instance is a file URL, whether
 * with or without `//`.
 *
 * @example
 * ```ts
 * import { isFileUrl } from "@ayonli/jsext/path";
 *
 * console.assert(isFileUrl("file:///C:/Windows/System32"));
 * console.assert(isFileUrl("file://localhost/C:/Windows/System32"));
 * console.assert(isFileUrl("file:///usr/bin"));
 * console.assert(isFileUrl("file:/usr/bin"));
 * console.assert(isFileUrl("file:///usr/bin?foo=bar"));
 * console.assert(isFileUrl(new URL("file:///usr/bin?foo=bar")));
 * ```
 */
function isFileUrl(path) {
    return typeof path === "string"
        ? /^file:((\/\/|\/)\S+|\/?$)/i.test(path)
        : path.protocol === "file:";
}
/**
 * Checks if the given `path` is an absolute path.
 *
 * @example
 * ```ts
 * import { isAbsolute } from "@ayonli/jsext/path";
 *
 * console.assert(isAbsolute("/usr/bin"));
 * console.assert(isAbsolute("C:\\Windows\\System32"));
 * console.assert(isAbsolute("http://example.com"));
 * console.assert(isAbsolute("file:///C:/Windows/System32"));
 * console.assert(isAbsolute("file://localhost/C:/Windows/System32?foo=bar#baz"));
 * ```
 */
function isAbsolute(path) {
    return isPosixPath(path) || isWindowsPath(path) || isUrl(path);
}
/**
 * Splits the `path` into well-formed segments.
 *
 * @example
 * ```ts
 * import { split } from "@ayonli/jsext/path";
 *
 * console.log(split("/usr/bin")); // ["/", "usr", "bin"]
 * console.log(split("C:\\Windows\\System32")); // ["C:\\", "Windows", "System32"]
 * console.log(split("file:///user/bin")); // ["file:///", "usr", "bin"]
 *
 * console.log(split("http://example.com/foo/bar?foo=bar#baz"));
 * // ["http://example.com", "foo", "bar", "?foo=bar", "#baz"]
 * ```
 */
function split(path) {
    if (!path) {
        return [];
    }
    else if (isUrl(path)) {
        const { protocol, host, pathname, search, hash } = new URL(path);
        let origin = protocol + "//" + host;
        if (protocol === "file:" && !host) {
            origin += "/";
        }
        if (pathname === "/") {
            if (search && hash) {
                return [origin, search, hash];
            }
            else if (search) {
                return [origin, search];
            }
            else if (hash) {
                return [origin, hash];
            }
            else {
                return [origin];
            }
        }
        else {
            const segments = trim(decodeURI(pathname), "/").split(/[/\\]+/);
            if (search && hash) {
                return [origin, ...segments, search, hash];
            }
            else if (search) {
                return [origin, ...segments, search];
            }
            else if (hash) {
                return [origin, ...segments, hash];
            }
            else {
                return [origin, ...segments];
            }
        }
    }
    else if (isWindowsPath(path)) {
        const [_, volume, ...segments] = split("file:///" + path.replace(/[/\\]+/g, "/"));
        return [volume + "\\", ...segments];
    }
    else if (isPosixPath(path)) {
        const [_, ...segments] = split("file://" + path.replace(/[/\\]+/g, "/"));
        return ["/", ...segments];
    }
    else { // relative path
        path = path.replace(/[/\\]+/g, "/");
        const [_path, query] = path.split("?");
        if (query) {
            const segments = _path ? trimEnd(_path, "/").split("/") : [];
            const [search, hash] = query.split("#");
            if (hash) {
                return [...segments, "?" + search, "#" + hash];
            }
            else {
                return [...segments, "?" + search];
            }
        }
        else {
            const [pathname, hash] = path.split("#");
            const segments = pathname ? trimEnd(pathname, "/").split("/") : [];
            if (hash) {
                return [...segments, "#" + hash];
            }
            else {
                return segments;
            }
        }
    }
}

/**
 * Platform-independent utility functions for dealing with file system paths and
 * URLs.
 *
 * The functions in this module are designed to be generic and work in any
 * runtime, whether server-side or browsers. They can be used for both system
 * paths and URLs.
 * @module
 */
/**
 * Platform-specific path segment separator. The value is `\` in Windows
 * server-side environments, and `/` elsewhere.
 */
const sep = (() => {
    if (isDeno) {
        if (Deno.build.os === "windows") {
            return "\\";
        }
    }
    else if (isNodeLike) {
        if (process.platform === "win32") {
            return "\\";
        }
    }
    return "/";
})();
/**
 * Returns the current working directory.
 *
 * **NOTE:** In the browser, this function returns the current origin and pathname.
 *
 * This function may fail in unsupported environments or being rejected by the
 * permission system of the runtime.
 */
function cwd() {
    if (isDeno) {
        return Deno.cwd();
    }
    else if (isNodeLike) {
        return process.cwd();
    }
    else if (typeof location === "object" && location.origin) {
        return location.origin + (location.pathname === "/" ? "" : location.pathname);
    }
    else {
        throw new NotSupportedError("Unable to determine the current working directory.");
    }
}
/**
 * Concatenates all given `segments` into a well-formed path.
 *
 * @example
 * ```ts
 * import { join } from "@ayonli/jsext/path";
 *
 * console.log(join("foo", "bar")); // "foo/bar" or "foo\\bar" on Windows
 * console.log(join("/", "foo", "bar")); // "/foo/bar"
 * console.log(join("C:\\", "foo", "bar")); // "C:\\foo\\bar"
 * console.log(join("file:///foo", "bar", "..")) // "file:///foo"
 *
 * console.log(join("http://example.com", "foo", "bar", "?query"));
 * // "http://example.com/foo/bar?query"
 * ```
 */
function join(...segments) {
    let _paths = [];
    for (let i = 0; i < segments.length; i++) {
        const path = segments[i];
        if (path) {
            if (isAbsolute(path)) {
                _paths = [];
            }
            _paths.push(path);
        }
    }
    const paths = [];
    for (let i = 0; i < _paths.length; i++) {
        let segment = _paths[i];
        for (const _segment of split(segment)) {
            if (_segment === "..") {
                if (!paths.length || paths.every(p => p === "..")) {
                    paths.push("..");
                }
                else if (paths.length > 2
                    || (paths.length === 2 && !isAbsolute(paths[1]))
                    || (paths.length === 1 && !isAbsolute(paths[0]))) {
                    paths.pop();
                }
            }
            else if (_segment && _segment !== ".") {
                paths.push(_segment);
            }
        }
    }
    if (!paths.length) {
        return ".";
    }
    const start = paths[0];
    const _sep = isUrl(start) || isPosixPath(start) ? "/" : isWindowsPath(start) ? "\\" : sep;
    let path = "";
    for (let i = 0; i < paths.length; i++) {
        const segment = paths[i];
        if (!path || segment[0] === "?" || segment[0] === "#") {
            path += segment;
        }
        else if (isVolume(segment)) {
            if (path) {
                path += segment + "/";
            }
            else {
                path = segment;
            }
        }
        else {
            path += (path.endsWith(_sep) ? "" : _sep) + trim(segment, "/\\");
        }
    }
    if (/^file:\/\/\/[a-z]:$/i.test(path)) {
        return path + "/";
    }
    else {
        return path;
    }
}
/**
 * Resolves path `segments` into a well-formed path.
 *
 * This function is similar to {@link join}, except it always returns an
 * absolute path based on the current working directory if the input segments
 * are not absolute by themselves.
 */
function resolve(...segments) {
    segments = segments.filter(s => s !== "");
    const _cwd = cwd();
    if (!segments.length) {
        return _cwd;
    }
    segments = isAbsolute(segments[0]) ? segments : [_cwd, ...segments];
    return join(...segments);
}
/**
 * Converts the given URL to a file system path if it's not one already.
 *
 * @example
 * ```ts
 * import { toFsPath } from "@ayonli/jsext/path";
 *
 * console.log(toFsPath("file:///foo/bar")); // "/foo/bar"
 * console.log(toFsPath("file:///c:/foo/bar")); // "c:\\foo\\bar"
 * ```
 */
function toFsPath(url) {
    if (typeof url === "object") {
        if (url.protocol === "file:") {
            return join(fileUrlToFsPath(url.toString()));
        }
        else {
            throwNonFileUrlConversionError();
        }
    }
    if (isFsPath(url)) {
        return url;
    }
    else if (isFileUrl(url)) {
        return join(fileUrlToFsPath(url));
    }
    else if (!isUrl(url)) {
        return resolve(url);
    }
    else {
        throwNonFileUrlConversionError();
    }
}
function fileUrlToFsPath(url) {
    return url.replace(/^file:(\/\/)?/i, "").replace(/^\/([a-z]):/i, "$1:");
}
function throwNonFileUrlConversionError() {
    throw new NotSupportedError("Cannot convert a non-file URL to a file system path.");
}

/**
 * This error indicates that the operation is invalid, such as trying to copy a
 * directory without the `recursive` option.
 *
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
class InvalidOperationError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "InvalidOperationError", code: 400 });
    }
}
registerErrorType(InvalidOperationError);
/**
 * This error indicates that an operation cannot be performed because the target
 * path is a directory while a file is expected.
 *
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
class IsDirectoryError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "IsDirectoryError", code: 400 });
    }
}
registerErrorType(IsDirectoryError);
/**
 * This error indicates that an operation cannot be performed because the target
 * path is a file while a directory is expected.
 *
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
class NotDirectoryError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NotDirectoryError", code: 400 });
    }
}
registerErrorType(NotDirectoryError);
/**
 * This error indicates that the file is too large, or the file system doesn't
 * have enough space to store the new content.
 *
 * NOTE: This error has an HTTP-compatible code of `413`.
 */
class FileTooLargeError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FileTooLargeError", code: 413 });
    }
}
registerErrorType(FileTooLargeError);
/**
 * This error indicates that too many symbolic links were encountered when
 * resolving the filename.
 *
 * NOTE: This error has an HTTP-compatible code of `508`.
 */
class FilesystemLoopError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FilesystemLoopError", code: 508 });
    }
}
registerErrorType(FilesystemLoopError);
/**
 * This error indicates that the file is busy at the moment, such as being
 * locked by another program.
 *
 * NOTE: This error has an HTTP-compatible code of `423`.
 */
class BusyError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "BusyError", code: 423 });
    }
}
registerErrorType(BusyError);
/**
 * This error indicates that the operation is interrupted by the underlying file
 * system.
 *
 * NOTE: This error has an HTTP-compatible code of `500`.
 */
class InterruptedError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "InterruptedError", code: 500 });
    }
}
registerErrorType(InterruptedError);

/**
 * Universal file system APIs for both server and browser applications.
 *
 * This module is guaranteed to work in the following environments:
 *
 * - Node.js
 * - Deno
 * - Bun
 * - Modern browsers
 * - Cloudflare Workers (limited support and experimental)
 *
 * We can also use the {@link runtime} function to check whether the runtime
 * has file system support. When `runtime().fsSupport` is `true`, this module
 * should work properly.
 *
 * In most browsers, this module uses the
 * [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).
 * In Chromium browsers, this module can also access the device's local file
 * system via `window.showOpenFilePicker()` and `window.showDirectoryPicker()`.
 *
 * This module also provides limited support for Cloudflare Workers, however it
 * requires setting the `[site].bucket` option in the `wrangler.toml` file. Only
 * the reading functions are supported, such as {@link readFile} and
 * {@link readDir}, these functions allow us reading static files in the workers,
 * writing functions is not implemented at the moment. More details about
 * serving static assets in Cloudflare Workers can be found here:
 * [Add static assets to an existing Workers project](https://developers.cloudflare.com/workers/configuration/sites/start-from-worker/).
 *
 * **Errors:**
 *
 * When a file system operation fails, this module throws one of following
 * derived {@link Exception} instances:
 *
 * - `NotAllowedError`: The operation is not allowed, such as being blocked by
 *   the permission system.
 * - `NotFoundError`: The file or directory does not exist.
 * - `AlreadyExistsError`: The file or directory already exists.
 * - `InvalidOperationError`: The operation is invalid, such as trying to copy a
 *   directory without the `recursive` option.
 * - `IsDirectoryError`: The path is a directory, not a file.
 * - `NotDirectoryError`: The path is a file, not a directory.
 * - `FileTooLargeError`: The file is too large, or the file system doesn't have
 *   enough space to store the new content.
 * - `FilesystemLoopError`:  Too many symbolic links were encountered when
 *   resolving the filename.
 * - `BusyError`: The file is busy at the moment, such as being locked by
 *   another program.
 * - `InterruptedError`: The operation is interrupted by the underlying file
 *   system.
 * - `NotSupportedError`: The operation is not supported by the current
 *   environment.
 *
 * Other errors may also be thrown by the runtime, such as `TypeError`.
 * @module
 */
/**
 * Platform-specific end-of-line marker. The value is `\r\n` in Windows
 * server-side environments, and `\n` elsewhere.
 */
(() => {
    if (typeof Deno === "object" && typeof Deno.build === "object") {
        return Deno.build.os === "windows" ? "\r\n" : "\n";
    }
    else if (typeof process === "object" && typeof process.platform === "string") {
        return process.platform === "win32" ? "\r\n" : "\n";
    }
    else {
        return "\n";
    }
})();

const urlCache = new Map();
/**
 * This function is primarily used to bypass the same-origin policy for Web
 * Workers in the browser, it downloads the script from the given URL and
 * converts it to an object URL which can be used by the `Worker` constructor.
 *
 * This function can also be used in other scenarios as it also corrects the
 * content-type of the response to ensure the script can be loaded properly.
 *
 * NOTE: This function is primarily designed for the browser, it has very little
 * use on the server side.
 */
async function getObjectURL(src, mimeType = "text/javascript") {
    var _a;
    const isAbsolute = isUrl(src);
    let cache = isAbsolute ? urlCache.get(src) : undefined;
    if (cache) {
        return cache;
    }
    // Use fetch to download the script and compose an object URL which can
    // bypass the same-origin policy for web workers.
    const res = await fetch(src);
    if (!res.ok) {
        throw new NetworkError(`Failed to fetch resource: ${src}`);
    }
    let blob;
    // JavaScript has more than one MIME types, so we just check it loosely.
    const type = mimeType.includes("javascript") ? "javascript" : mimeType;
    if ((_a = res.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.includes(type)) {
        blob = await res.blob();
    }
    else {
        // If the MIME type is not matched, we need to convert the response to
        // a new Blob with the correct MIME type.
        const buf = await res.arrayBuffer();
        blob = new Blob([new Uint8Array(buf)], {
            type: mimeType,
        });
    }
    cache = URL.createObjectURL(blob);
    isAbsolute && urlCache.set(src, cache);
    return cache;
}

/**
 * The `module` module purified for the web.
 * @module
 */
function interop(module, strict = undefined) {
    if (typeof module === "function") {
        return module().then(mod => interop(mod, strict));
    }
    else if (module instanceof Promise) {
        return module.then(mod => interop(mod, strict));
    }
    let exports = module["module.exports"];
    if (typeof exports !== "undefined") {
        return exports;
    }
    else if (isExportsObject(exports = module["default"])) {
        const hasEsModule = module["__esModule"] === true
            || exports["__esModule"] === true;
        if (hasEsModule) {
            return exports;
        }
        else if (strict) {
            return module;
        }
        const exportNames = (x) => x !== "default" && x !== "__esModule";
        const moduleKeys = Object.getOwnPropertyNames(module)
            .filter(exportNames).sort();
        const defaultKeys = Object.getOwnPropertyNames(exports)
            .filter(exportNames).sort();
        if (String(moduleKeys) === String(defaultKeys) ||
            (strict === false && !moduleKeys.length)) {
            return exports;
        }
    }
    return module;
}
function isExportsObject(module) {
    return typeof module === "object" && module !== null && !Array.isArray(module);
}

const moduleCache = new Map();
async function resolveModule(modId, baseUrl = undefined) {
    let module;
    if (isNode || isBun) {
        const path = baseUrl ? toFsPath(new URL(modId, baseUrl).href) : modId;
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
                        const _url = await getObjectURL(url);
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
    return interop(module);
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
            else if (typeof arg["@@type"] === "string" && getErrorConstructor(arg["@@type"])) {
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
/**
 * @ignore
 * @internal
 */
function isCallRequest(msg) {
    return msg && typeof msg === "object"
        && ((msg.type === "call" && typeof msg.module === "string" && typeof msg.fn === "string") ||
            (["next", "return", "throw"].includes(msg.type) && typeof msg.taskId === "number"))
        && Array.isArray(msg.args);
}
/**
 * @ignore
 * @internal
 */
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

/**
 * This module is only used internally by the `parallel()` function to spawn
 * workers, DON'T use it in your own code.
 * @internal
 * @module
 */
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
