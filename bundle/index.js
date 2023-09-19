(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global["@ayonli/jsext"] = factory());
})(this, (function () { 'use strict';

    var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
    /** Counts the occurrence of the element in the array. */
    function count$1(arr, ele) {
        let count = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === ele) {
                count++;
            }
        }
        return count;
    }
    /**
     * Performs a shallow compare to another array and see if it contains the same elements as
     * this array.
     */
    function equals$1(arr1, arr2) {
        if (arr1.length !== arr2.length) {
            return false;
        }
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }
        return true;
    }
    /** Breaks the array into smaller chunks according to the given delimiter. */
    function split$1(arr, delimiter) {
        const chunks = [];
        const limit = arr.length;
        let offset = 0;
        for (let i = 0; i < limit; i++) {
            if (arr[i] === delimiter) {
                chunks.push(arr.slice(offset, i));
                offset = i + 1;
            }
        }
        if (offset < limit) {
            chunks.push(arr.slice(offset, limit));
        }
        else if (offset === limit) {
            const ctor = arr.constructor;
            if (typeof ctor.from === "function") {
                chunks.push(ctor.from([]));
            }
            else {
                chunks.push(new ctor([]));
            }
        }
        return chunks;
    }
    /** Breaks the array into smaller chunks according to the given length. */
    function chunk$2(arr, length) {
        const limit = arr.length;
        const size = Math.ceil(limit / length);
        const chunks = new Array(size);
        let offset = 0;
        let idx = 0;
        while (offset < limit) {
            chunks[idx] = arr.slice(offset, offset + length);
            offset += length;
            idx++;
        }
        return chunks;
    }
    /** Returns a subset of the array that contains only unique items. */
    function uniq(arr) {
        return [...new Set(arr)];
    }
    /**
     * Reorganizes the elements in the array in random order.
     *
     * This function mutates the array.
     */
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    /**
     * Orders the items of the array according to the specified comparable `key` (whose value
     * must either be a numeric or string).
     */
    function orderBy(arr, key, order = "asc") {
        const items = arr.slice();
        items.sort((a, b) => {
            if (typeof a !== "object" || typeof b !== "object" ||
                !a || !b ||
                Array.isArray(a) || Array.isArray(b)) {
                return -1;
            }
            const _a = a[key];
            const _b = b[key];
            if (_a === undefined || _b === undefined) {
                return -1;
            }
            if (typeof _a === "number" && typeof _b === "number") {
                return _a - _b;
            }
            else if ((typeof _a === "string" && typeof _b === "string")
                || (typeof _a === "bigint" && typeof _b === "bigint")) {
                if (_a < _b) {
                    return -1;
                }
                else if (_a > _b) {
                    return 1;
                }
                else {
                    return 1;
                }
            }
            else {
                return -1;
            }
        });
        if (order === "desc") {
            items.reverse();
        }
        return items;
    }
    function groupBy(arr, fn, type = Object) {
        if (type === Map) {
            const groups = new Map();
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const key = fn(item, i);
                const list = groups.get(key);
                if (list) {
                    list.push(item);
                }
                else {
                    groups.set(key, [item]);
                }
            }
            return groups;
        }
        else {
            const groups = {};
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                const key = fn(item, i);
                const list = groups[key];
                if (list) {
                    list.push(item);
                }
                else {
                    groups[key] = [item];
                }
            }
            return groups;
        }
    }

    /**
     * Compares two strings, returns `-1` if `a < b`, `0` if `a == b` and `1` if `a > b`.
     */
    function compare$1(str1, str2) {
        if (str1 < str2) {
            return -1;
        }
        else if (str1 > str2) {
            return 1;
        }
        else {
            return 0;
        }
    }
    /** Returns a random string, the charset matches `/[0-9a-zA-Z]/` */
    function random$1(length) {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let str = "";
        while (0 < length--) {
            const i = Math.floor(Math.random() * chars.length);
            str += chars[i];
        }
        return str;
    }
    /** Counts the occurrence of the sub-string in the string. */
    function count(str, sub) {
        if (!sub) {
            return str.length + 1;
        }
        else if (!str) {
            return 0;
        }
        return str.split(sub).length - 1;
    }
    /**
     * Capitalizes the string, if `all` is true, all words are capitalized, otherwise only
     * the first word will be capitalized.
     */
    function capitalize(str, all) {
        const regex = all ? /\w+/g : /\w+/;
        return str.replace(regex, (match) => {
            return match[0].toUpperCase() + match.slice(1).toLowerCase();
        });
    }
    /** Replaces the spaces between non-empty characters of the string with hyphens (`-`). */
    function hyphenate(str) {
        return str.replace(/(\S)\s+(\S)/g, (_, $1, $2) => $1 + "-" + $2);
    }
    /** Extracts words (in latin characters) from the string. */
    function words(str) {
        const matches = str.match(/\w+/g);
        return matches ? [...matches] : [];
    }
    /** Breaks the string into smaller chunks according to the given length. */
    function chunk$1(str, length) {
        return chunk$2(str, length);
    }
    /** Truncates the string to the given length (including the ending `...`). */
    function truncate(str, length) {
        if (length <= 0) {
            return "";
        }
        else if (length >= str.length) {
            return str;
        }
        else {
            length -= 3;
            return str.slice(0, length) + "...";
        }
    }
    const encoder = new TextEncoder();
    /** Returns the byte length of the string. */
    function byteLength(str) {
        return encoder.encode(str).byteLength;
    }

    String.compare = compare$1;
    String.random = random$1;
    String.prototype.count = function count$1(sub) {
        return count(String(this), sub);
    };
    String.prototype.capitalize = function capitalize$1(all) {
        return capitalize(String(this), all);
    };
    String.prototype.hyphenate = function capitalize() {
        return hyphenate(String(this));
    };
    String.prototype.words = function words$1() {
        return words(String(this));
    };
    String.prototype.chunk = function chunk(length) {
        return chunk$1(String(this), length);
    };
    String.prototype.truncate = function truncate$1(length) {
        return truncate(String(this), length);
    };
    String.prototype.byteLength = function byteLength$1() {
        return byteLength(String(this));
    };

    /** Returns `true` if the given value is a float number, `false` otherwise. */
    function isFloat(value) {
        return typeof value === "number"
            && !Number.isNaN(value)
            && (!Number.isFinite(value) || value % 1 !== 0);
    }
    /**
     * Returns `true` if the given value is a numeric value, `false` otherwise. A numeric value is a
     * number, a bigint, or a string that can be converted to a number or bigint.
     */
    function isNumeric(value) {
        const type = typeof value;
        if (type === "number" || type === "bigint") {
            return true;
        }
        else if (type === "string") {
            if (!Number.isNaN(value)) {
                return true;
            }
            else {
                try {
                    BigInt(value);
                    return true;
                }
                catch (_a) {
                    return false;
                }
            }
        }
        return false;
    }
    /** Return `true` if a number is between the given range (inclusive). */
    function isBetween(value, [min, max]) {
        return value >= min && value <= max;
    }
    /** Returns a random integer ranged from `min` to `max`. */
    function random(min, max) {
        return min + Math.floor(Math.random() * (max - min + 1));
    }
    /** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
    function* sequence(min, max, step = 1, loop = false) {
        let id = min;
        while (true) {
            yield id;
            if (id >= max) {
                if (loop) {
                    id = min;
                }
                else {
                    break;
                }
            }
            else {
                id += step;
            }
        }
    }

    Number.isFloat = isFloat;
    Number.isNumeric = isNumeric;
    Number.isBetween = isBetween;
    Number.random = random;
    Number.sequence = sequence;

    Array.prototype.first = function first() {
        return this[0];
    };
    Array.prototype.last = function last() {
        return this[this.length - 1];
    };
    Array.prototype.count = function count(ele) {
        return count$1(this, ele);
    };
    Array.prototype.equals = function equals(another) {
        return equals$1(this, another);
    };
    Array.prototype.split = function split(delimiter) {
        return split$1(this, delimiter);
    };
    Array.prototype.chunk = function chunk(length) {
        return chunk$2(this, length);
    };
    Array.prototype.uniq = function uniq$1() {
        return uniq(this);
    };
    Array.prototype.shuffle = function shuffle$1() {
        return shuffle(this);
    };
    Array.prototype.toShuffled = function toShuffled() {
        return this.slice().shuffle();
    };
    if (!Array.prototype.toReversed) {
        Array.prototype.toReversed = function toReversed() {
            return this.slice().reverse();
        };
    }
    if (!Array.prototype.toSorted) {
        Array.prototype.toSorted = function toSorted(fn) {
            return this.slice().sort(fn);
        };
    }
    Array.prototype.orderBy = function orderBy$1(key, order = "asc") {
        return orderBy(this, key, order);
    };
    Array.prototype.groupBy = function orderBy(fn, type = Object) {
        return groupBy(this, fn, type);
    };

    /** Like `Buffer.compare` but for pure `Uint8Array`. */
    function compare(arr1, arr2) {
        if (arr1 === arr2) {
            return 0;
        }
        for (let i = 0; i < arr1.length; i++) {
            const ele1 = arr1[i];
            const ele2 = arr2[i];
            if (ele2 === undefined) {
                return 1;
            }
            else if (ele1 < ele2) {
                return -1;
            }
            else if (ele1 > ele2) {
                return 1;
            }
        }
        return arr1.length < arr2.length ? -1 : 0;
    }
    /**
     * Compare this array to another array and see if it contains the same elements as
     * this array.
     */
    function equals(arr1, arr2) {
        if (!(arr1 instanceof Uint8Array) || !(arr2 instanceof Uint8Array)) {
            return false;
        }
        return equals$1(arr1, arr2);
    }
    /** Breaks the array into smaller chunks according to the given delimiter. */
    function split(arr, delimiter) {
        return split$1(arr, delimiter);
    }
    /** Breaks the array into smaller chunks according to the given length. */
    function chunk(arr, length) {
        return chunk$2(arr, length);
    }

    Uint8Array.compare = compare;
    Uint8Array.prototype.equals = function equals$1(another) {
        return equals(this, another);
    };
    Uint8Array.prototype.split = function split$1(delimiter) {
        return split(this, delimiter);
    };
    Uint8Array.prototype.chunk = function chunk$1(length) {
        return chunk(this, length);
    };

    function hasOwn(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }
    /**
     * Returns `true` if the specified object has the indicated method as its own method (in its own
     * prototype). If the method is inherited, or is not in the prototype, or does not exist, this
     * function returns `false`.
     */
    function hasOwnMethod(obj, method) {
        var _a;
        const proto = Object.getPrototypeOf(obj);
        if (!proto || !hasOwn(proto, method)) {
            return false;
        }
        return typeof ((_a = Object.getOwnPropertyDescriptor(proto, method)) === null || _a === void 0 ? void 0 : _a.value) === "function";
    }
    function patch(target, ...sources) {
        for (const source of sources) {
            for (const key of Reflect.ownKeys(source)) {
                if (!hasOwn(target, key) || target[key] === undefined) {
                    target[key] = source[key];
                }
            }
        }
        return target;
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
    function as(value, type) {
        if (typeof type !== "function") {
            throw new TypeError("type must be a valid constructor");
        }
        let _type;
        const primitiveMap = {
            "string": String,
            "number": Number,
            "bigint": BigInt,
            "boolean": Boolean,
            "symbol": Symbol
        };
        if (value instanceof type) {
            if ([String, Number, Boolean].includes(type)) {
                return value.valueOf(); // make sure the primitives are returned.
            }
            else {
                return value;
            }
        }
        else if ((_type = typeof value) && primitiveMap[_type] === type) {
            return value;
        }
        return null;
    }
    /**
     * Returns `true` if the given value is valid. Thee following values are considered invalid:
     *
     * - `undefined`
     * - `null`
     * - `NaN`
     * - `Invalid Date`
     */
    function isValid(value) {
        return value !== undefined
            && value !== null
            && !Object.is(value, NaN)
            && !(value instanceof Date && value.toString() === "Invalid Date");
    }

    if (!Object.hasOwn) {
        Object.hasOwn = hasOwn;
    }
    if (!Object.hasOwnMethod) {
        Object.hasOwnMethod = hasOwnMethod;
    }
    Object.patch = patch;
    Object.pick = pick;
    Object.omit = omit;
    Object.as = as;
    Object.isValid = isValid;

    /** Returns the sum value of the given values. */
    function sum(...values) {
        return values.reduce((sum, value) => sum + value, 0);
    }
    /** Returns the average value of the given values. */
    function avg(...values) {
        return Math.sum(...values) / values.length;
    }
    /** Returns a the product value multiplied by the given values. */
    function product(...values) {
        var _a;
        return values.slice(1).reduce((sum, value) => sum * value, (_a = values[0]) !== null && _a !== void 0 ? _a : 0);
    }

    Math.sum = sum;
    Math.avg = avg;
    Math.product = product;

    /** Try to resolve a promise with a timeout limit. */
    async function timeout(value, ms) {
        const result = await Promise.race([
            value,
            new Promise((_, reject) => setTimeout(() => {
                reject(new Error(`operation timeout after ${ms}ms`));
            }, ms))
        ]);
        return result;
    }
    /** Resolves a promise only after the given duration. */
    async function after(value, ms) {
        const [result] = await Promise.allSettled([
            value,
            new Promise(resolve => setTimeout(resolve, ms))
        ]);
        if (result.status === "fulfilled") {
            return result.value;
        }
        else {
            throw result.reason;
        }
    }
    /** Blocks the context for a given time. */
    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /** Blocks the context until the test is passed. */
    async function until(test) {
        if (typeof globalThis.setImmediate === "undefined") {
            // @ts-ignore
            globalThis.setImmediate = (cb) => setTimeout(cb, 0);
        }
        do {
            await new Promise(globalThis.setImmediate);
        } while ((await test()) == false);
    }

    Promise.timeout = timeout;
    Promise.after = after;
    Promise.sleep = sleep;
    Promise.until = until;

    const inverse = Symbol("inverse");
    /** Bi-directional map, keys and values are unique and map to each other. */
    class BiMap extends Map {
        get [Symbol.toStringTag]() {
            return "BiMap";
        }
        constructor(iterable = null) {
            super();
            this[inverse] = new Map();
            if (iterable) {
                for (const [key, value] of iterable) {
                    this.set(key, value);
                }
            }
        }
        set(key, value) {
            super.set(key, value);
            this[inverse].set(value, key);
            return this;
        }
        getKey(value) {
            return this[inverse].get(value);
        }
        hasValue(value) {
            return this[inverse].has(value);
        }
        deleteValue(value) {
            if (this[inverse].has(value)) {
                const key = this[inverse].get(value);
                super.delete(key);
                this[inverse].delete(value);
                return true;
            }
            return false;
        }
        clear() {
            super.clear();
            this[inverse].clear();
        }
    }

    const internal = Symbol("internal");
    /** Case-insensitive map, keys are case-insensitive. */
    class CiMap {
        get [Symbol.toStringTag]() {
            return "CiMap";
        }
        get size() {
            return this[internal].size;
        }
        constructor(iterable = null) {
            this[internal] = new Map();
            if (iterable) {
                for (const [key, value] of iterable) {
                    this.set(key, value);
                }
            }
        }
        set(key, value) {
            const id = String(key).toLowerCase();
            this[internal].set(id, { key, value });
            return this;
        }
        get(key) {
            var _a;
            const id = String(key).toLowerCase();
            return (_a = this[internal].get(id)) === null || _a === void 0 ? void 0 : _a.value;
        }
        has(key) {
            const id = String(key).toLowerCase();
            return this[internal].has(id);
        }
        delete(key) {
            const id = String(key).toLowerCase();
            return this[internal].delete(id);
        }
        clear() {
            this[internal].clear();
        }
        *entries() {
            for (const { key, value } of this[internal].values()) {
                yield [key, value];
            }
        }
        *keys() {
            for (const { key } of this[internal].values()) {
                yield key;
            }
        }
        *values() {
            for (const { value } of this[internal].values()) {
                yield value;
            }
        }
        forEach(callbackfn, thisArg) {
            this[internal].forEach(({ key, value }) => {
                callbackfn(value, key, this);
            }, thisArg);
        }
        [Symbol.iterator]() {
            return this.entries();
        }
    }

    // @ts-ignore
    globalThis["BiMap"] = BiMap;
    // @ts-ignore
    globalThis["CiMap"] = CiMap;

    class Exception extends Error {
        constructor(message, options = 0) {
            super(message);
            this.code = 0;
            Object.defineProperty(this, "name", {
                configurable: true,
                enumerable: false,
                writable: true,
                value: this.constructor.name,
            });
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

    /** Transform the error to a plain object. */
    function toObject(err) {
        return omit(err, []);
    }
    function fromObject(obj) {
        var _a;
        // @ts-ignore
        let ctor = globalThis[obj.name];
        if (!ctor) {
            if (obj["name"] === "Exception") {
                ctor = Exception;
            }
            else {
                ctor = Error;
            }
        }
        const err = Object.create(ctor.prototype, {
            message: {
                configurable: true,
                enumerable: false,
                writable: true,
                value: (_a = obj["message"]) !== null && _a !== void 0 ? _a : "",
            },
        });
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
            // @ts-ignore
            err[key] = obj[key];
        });
        return err;
    }

    //@ts-ignore
    globalThis["Exception"] = Exception;
    Error.toObject = toObject;
    Error.fromObject = fromObject;
    Error.prototype.toJSON = function toJSON() {
        return toObject(this);
    };

    var checkIterable = {};

    Object.defineProperty(checkIterable, "__esModule", {
      value: true
    });
    checkIterable.isIterable = isIterable;
    checkIterable.isAsyncIterable = isAsyncIterable;
    checkIterable.isIteratorLike = isIteratorLike;
    checkIterable.isIterableIterator = isIterableIterator;
    checkIterable.isAsyncIterableIterator = isAsyncIterableIterator;
    var isGenerator_1 = checkIterable.isGenerator = isGenerator;
    var isAsyncGenerator_1 = checkIterable.isAsyncGenerator = isAsyncGenerator;
    function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }
    if (!Symbol.asyncIterator) {
      Symbol.asyncIterator = Symbol("Symbol.asyncIterator");
    }

    /**
     * Checks if the given object is an Iterable (implemented `@@iterator`).
     * @returns {obj is Iterable<any>}
     */
    function isIterable(obj) {
      return obj !== null && obj !== undefined && typeof obj[Symbol.iterator] === "function";
    }

    /**
     * Checks if the given object is an AsyncIterable (implemented `@@asyncIterator`).
     * @returns {obj is AsyncIterable<any>}
     */
    function isAsyncIterable(obj) {
      return obj !== null && obj !== undefined && typeof obj[Symbol.asyncIterator] === "function";
    }

    /**
     * Checks if the given object is an IteratorLike (implemented `next`).
     * @returns {obj is { next: Function }}
     */
    function isIteratorLike(obj) {
      // An iterable object has a 'next' method, however including a 'next' method
      // doesn't ensure the object is an iterator, it is only iterator-like.
      return _typeof(obj) === "object" && obj !== null && typeof obj.next === "function";
    }

    /**
     * Checks if the given object is an IterableIterator (implemented both
     * `@@iterator` and `next`).
     */
    function isIterableIterator(obj) {
      return isIteratorLike(obj) && typeof obj[Symbol.iterator] === "function";
    }

    /**
     * Checks if the given object is an AsyncIterableIterator (implemented
     * both `@@asyncIterator` and `next`).
     * @returns {obj is AsyncIterableIterator<any>}
     */
    function isAsyncIterableIterator(obj) {
      return isIteratorLike(obj) && typeof obj[Symbol.asyncIterator] === "function";
    }

    /**
     * Checks if the given object is a Generator.
     * @returns {obj is Generator}
     */
    function isGenerator(obj) {
      return isIterableIterator(obj) && hasGeneratorSpecials(obj);
    }

    /**
     * Checks if the given object is an AsyncGenerator.
     * @returns {obj is AsyncGenerator}
     */
    function isAsyncGenerator(obj) {
      return isAsyncIterableIterator(obj) && hasGeneratorSpecials(obj);
    }
    function hasGeneratorSpecials(obj) {
      return typeof obj["return"] === "function" && typeof obj["throw"] === "function";
    }

    var _a;
    const AsyncFunction = (async function () { }).constructor;
    const AsyncGeneratorFunction = (async function* () { }).constructor;
    function _try(fn, ...args) {
        if (typeof fn === "function") {
            try {
                return _try(fn.apply(void 0, args));
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
                        const { done, value } = await returns.next(input);
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
                return [null, result];
            })();
        }
        else if (isGenerator_1(returns)) {
            return (function* () {
                let input;
                let result;
                while (true) {
                    try {
                        const { done, value } = returns.next(input);
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
    }
    /**
     * Inspired by Golang, creates a function that receives a `defer` function which can be used
     * to carry deferred jobs that will be run after the main function is complete.
     *
     * Multiple calls of the `defer` function is supported, and the callbacks are called in the
     * LIFO order. Callbacks can be async functions if the main function is an async function or
     * an async generator function, and all the running procedures will be awaited.
     *
     * @example
     *  const getVersion = await jsext.func(async (defer) => {
     *      const file = await fs.open("./package.json", "r");
     *      defer(() => file.close());
     *
     *      const content = await file.readFile("utf8");
     *      const pkg = JSON.parse(content);
     *
     *      return pkg.version as string;
     *  });
     */
    function func(fn) {
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
                                const { done, value } = await returns.next(input);
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
                            return result.value;
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
                                const { done, value } = returns.next(input);
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
    }
    /**
     * Wraps a function inside another function and returns a new function
     * that copies the original function's name and properties.
     */
    function wrap(fn, wrapper) {
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
    }
    const throttleCaches = new Map();
    function throttle(handler, options) {
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
    }
    /**
     * Merges properties and methods only if they're missing in the class.
     */
    function mergeIfNotExists(proto, source, mergeSuper = false) {
        const props = Reflect.ownKeys(source);
        for (const prop of props) {
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
        const _super = Object.getPrototypeOf(mixin);
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
        const desc = Object.getOwnPropertyDescriptor(source, prop);
        if (desc) {
            Object.defineProperty(proto, prop, desc);
        }
        else {
            proto[prop] = source[prop];
        }
    }
    function mixins(base, ...mixins) {
        const obj = { ctor: null };
        obj.ctor = class extends base {
        }; // make sure this class has no name
        for (const mixin of mixins) {
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
    }
    /** Checks if a class is a subclass of another class. */
    function isSubclassOf(ctor1, ctor2) {
        return typeof ctor1 === "function"
            && typeof ctor2 === "function"
            && ctor1.prototype instanceof ctor2;
    }
    function read(source, eventMap = undefined) {
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
    }
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
            const dirname = path.dirname(fileURLToPath((typeof document === 'undefined' && typeof location === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : typeof document === 'undefined' ? location.href : (_documentCurrentScript && _documentCurrentScript.src || new URL('index.js', document.baseURI).href))));
            let entry;
            if (["cjs", "esm"].includes(path.basename(dirname))) { // compiled
                entry = path.join(path.dirname(dirname), "worker.mjs");
            }
            else {
                entry = path.join(dirname, "worker.mjs");
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
                        ...((typeof document === 'undefined' && typeof location === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : typeof document === 'undefined' ? location.href : (_documentCurrentScript && _documentCurrentScript.src || new URL('index.js', document.baseURI).href)).split("/").slice(0, -1)),
                        "worker-web.mjs"
                    ].join("/");
                }
                else {
                    const _url = (options === null || options === void 0 ? void 0 : options.webWorkerEntry)
                        || "https://raw.githubusercontent.com/ayonli/jsext/main/esm/worker-web.mjs";
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
            },
        };
    }
    const jsext = {
        try: _try,
        func,
        wrap,
        throttle,
        mixins,
        isSubclassOf,
        read,
        run,
    };

    // @ts-ignore
    globalThis["AsyncFunction"] = AsyncFunction;
    // @ts-ignore
    globalThis["AsyncGeneratorFunction"] = AsyncGeneratorFunction;

    return jsext;

}));
//# sourceMappingURL=index.js.map
