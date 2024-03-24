import { equals as equals$1, split as split$1, chunk as chunk$1 } from '../array/base.js';
import { as } from '../object/index.js';
import { sum } from '../math/index.js';

/**
 * Functions for dealing with byte arrays (`Uint8Array`).
 * @module
 */
const defaultEncoder = new TextEncoder();
const defaultDecoder = new TextDecoder();
/**
 * A byte array is a `Uint8Array` that can be coerced to a string with `utf8`
 * encoding.
 */
class ByteArray extends Uint8Array {
    toString() {
        return text(this);
    }
    toJSON() {
        return {
            type: "ByteArray",
            data: Array.from(this),
        };
    }
}
function bytes(data) {
    if (typeof data === "string") {
        return new ByteArray(defaultEncoder.encode(data).buffer);
    }
    else {
        return new ByteArray(data);
    }
}
/**
 * Converts the byte array (or `Uint8Array`) to a string.
 * @param encoding Default value: `utf8`.
 */
function text(bytes, encoding = "utf8") {
    var _a, _b;
    if (encoding === "hex") {
        if (typeof Buffer === "function") {
            return ((_a = as(bytes, Buffer)) !== null && _a !== void 0 ? _a : Buffer.from(bytes)).toString("hex");
        }
        else {
            return bytes.reduce((str, byte) => {
                return str + byte.toString(16).padStart(2, "0");
            }, "");
        }
    }
    else if (encoding === "base64") {
        if (typeof Buffer === "function") {
            return ((_b = as(bytes, Buffer)) !== null && _b !== void 0 ? _b : Buffer.from(bytes)).toString("base64");
        }
        else {
            return btoa(defaultDecoder.decode(bytes));
        }
    }
    else if (typeof Buffer === "function" && bytes instanceof Buffer) {
        return bytes.toString("utf8");
    }
    else {
        return defaultDecoder.decode(bytes);
    }
}
/** Copies bytes from `src` array to `dest` and returns the number of bytes copied. */
function copy(src, dest) {
    if (src.length > dest.length) {
        src = src.subarray(0, dest.length);
    }
    dest.set(src);
    return src.length;
}
/** Like `Buffer.concat` but for pure `Uint8Array`. */
function concat(...arrays) {
    const length = sum(...arrays.map(arr => arr.length));
    const ctor = arrays[0].constructor;
    const result = new ctor(length);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}
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
/** Checks if the two byte arrays are equal to each other. */
function equals(arr1, arr2) {
    if (arr1.length < 1000) {
        return equals$1(arr1, arr2);
    }
    else if (arr1 === arr2) {
        return true;
    }
    else if (arr1.length !== arr2.length) {
        return false;
    }
    const len = arr1.length;
    const compressible = Math.floor(len / 4);
    const _arr1 = new Uint32Array(arr1.buffer, 0, compressible);
    const _arr2 = new Uint32Array(arr2.buffer, 0, compressible);
    for (let i = compressible * 4; i < len; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    for (let i = 0; i < _arr1.length; i++) {
        if (_arr1[i] !== _arr2[i]) {
            return false;
        }
    }
    return true;
}
/** Breaks the byte array into smaller chunks according to the given delimiter. */
function split(arr, delimiter) {
    return split$1(arr, delimiter);
}
/** Breaks the byte array into smaller chunks according to the given length. */
function chunk(arr, length) {
    return chunk$1(arr, length);
}

export { ByteArray, bytes, chunk, compare, concat, copy, bytes as default, equals, split, text };
//# sourceMappingURL=index.js.map
