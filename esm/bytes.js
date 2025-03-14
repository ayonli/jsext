import { equals as equals$1, includeSlice, startsWith as startsWith$1, endsWith as endsWith$1, split as split$1, chunk as chunk$1 } from './array/base.js';
import { decodeHex, decodeBase64, encodeHex, encodeBase64 } from './encoding.js';
import { sum } from './math.js';

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
function bytes(data, encoding = "utf8") {
    if (typeof data === "number") {
        return new ByteArray(data);
    }
    else if (typeof data === "string") {
        let _data;
        if (encoding === "hex") {
            _data = decodeHex(data);
        }
        else if (encoding === "base64") {
            _data = decodeBase64(data);
        }
        else {
            _data = defaultEncoder.encode(data);
        }
        return new ByteArray(_data.buffer, _data.byteOffset, _data.byteLength);
    }
    else if (ArrayBuffer.isView(data)) {
        return new ByteArray(data.buffer, data.byteOffset, data.byteLength);
    }
    else {
        return new ByteArray(data);
    }
}
/**
 * Converts the byte array (or `Uint8Array`) to a string.
 * @param encoding Default value: `utf8`.
 *
 * @example
 * ```ts
 * import { text } from "@ayonli/jsext/bytes";
 *
 * const arr = new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]);
 *
 * console.log(text(arr)); // "Hello, World!"
 * console.log(text(arr, "hex")); // "48656c6c6f2c20576f726c6421"
 * console.log(text(arr, "base64")); // "SGVsbG8sIFdvcmxkIQ=="
 * ```
 */
function text(bytes, encoding = "utf8") {
    if (encoding === "hex") {
        return encodeHex(bytes);
    }
    else if (encoding === "base64") {
        return encodeBase64(bytes);
    }
    else if (typeof Buffer === "function" && bytes instanceof Buffer) {
        return bytes.toString("utf8");
    }
    else {
        return defaultDecoder.decode(bytes);
    }
}
/**
 * Copies bytes from `src` array to `dest` and returns the number of bytes copied.
 *
 * @example
 * ```ts
 * import { copy } from "@ayonli/jsext/bytes";
 *
 * const src = new Uint8Array([1, 2, 3, 4, 5]);
 * const dest = new Uint8Array(3);
 *
 * const n = copy(src, dest);
 *
 * console.log(n); // 3
 * console.log(dest); // Uint8Array(3) [ 1, 2, 3 ]
 * ```
 */
function copy(src, dest) {
    if (src.length > dest.length) {
        src = src.subarray(0, dest.length);
    }
    dest.set(src);
    return src.length;
}
/**
 * Like `Buffer.concat` but for native `Uint8Array`.
 *
 * @example
 * ```ts
 * import { concat } from "@ayonli/jsext/bytes";
 *
 * const arr1 = new Uint8Array([1, 2, 3]);
 * const arr2 = new Uint8Array([4, 5, 6]);
 *
 * const result = concat(arr1, arr2);
 *
 * console.log(result); // Uint8Array(6) [ 1, 2, 3, 4, 5, 6 ]
 * ```
 */
function concat(...arrays) {
    var _a;
    const length = sum(...arrays.map(arr => arr.length));
    const ctor = (((_a = arrays[0]) === null || _a === void 0 ? void 0 : _a.constructor) || Uint8Array);
    const result = typeof Buffer === "function" && Object.is(ctor, Buffer)
        ? Buffer.alloc(length)
        : new ctor(length);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}
/**
 * Like `Buffer.compare` but for native `Uint8Array`.
 *
 * @example
 * ```ts
 * import { compare } from "@ayonli/jsext/bytes";
 *
 * const arr1 = new Uint8Array([1, 2, 3]);
 * const arr2 = new Uint8Array([1, 2, 4]);
 * const arr3 = new Uint8Array([1, 2, 3, 4]);
 * const arr4 = new Uint8Array([1, 2, 3]);
 * const arr5 = new Uint8Array([1, 2]);
 *
 * console.log(compare(arr1, arr2)); // -1
 * console.log(compare(arr1, arr3)); // -1
 * console.log(compare(arr1, arr4)); // 0
 * console.log(compare(arr1, arr5)); // 1
 * ```
 */
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
 * Checks if the two byte arrays are equal to each other.
 *
 * @example
 * ```ts
 * import { equals } from "@ayonli/jsext/bytes";
 *
 * const arr1 = new Uint8Array([1, 2, 3]);
 * const arr2 = new Uint8Array([1, 2, 3]);
 * const arr3 = new Uint8Array([1, 2, 4]);
 *
 * console.log(equals(arr1, arr2)); // true
 * console.log(equals(arr1, arr3)); // false
 * ```
 */
function equals(arr1, arr2) {
    if (arr1 === arr2) {
        return true;
    }
    else if (arr1.length !== arr2.length) {
        return false;
    }
    else if (arr1.length < 1000) {
        return equals$1(arr1, arr2);
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
/**
 * Checks if the byte array contains another array as a slice of its contents.
 *
 * @example
 * ```ts
 * import { includesSlice } from "@ayonli/jsext/bytes";
 *
 * const arr = new Uint8Array([1, 2, 3, 4, 5]);
 *
 * console.log(includesSlice(arr, new Uint8Array([3, 4]))); // true
 * console.log(includesSlice(arr, new Uint8Array([4, 3]))); // false
 * ```
 */
function includesSlice(arr, slice) {
    return includeSlice(arr, slice);
}
/**
 * Returns the index of the first occurrence of the slice in the byte array, or
 * -1 if it is not present. Optionally, we can specify where to start the search
 * by providing the `start` parameter.
 *
 * @example
 * ```ts
 * import { indexOfSlice } from "@ayonli/jsext/bytes";
 *
 * const arr = new Uint8Array([1, 2, 3, 4, 5]);
 * const slice = new Uint8Array([3, 4]);
 *
 * console.log(indexOfSlice(arr, slice)); // 2
 * console.log(indexOfSlice(arr, slice, 3)); // -1, starts searching from index 3
 * ```
 */
function indexOfSlice(arr, slice, start = 0) {
    if (start < 0) {
        start = Math.max(0, arr.length + start);
    }
    const limit = arr.length - slice.length;
    const s = slice[0];
    for (let i = start; i <= limit; i++) {
        if (arr[i] !== s) {
            continue;
        }
        let j = 1;
        while (j < slice.length && arr[i + j] === slice[j]) {
            j++;
        }
        if (j === slice.length) {
            return i;
        }
    }
    return -1;
}
/**
 * Checks if the byte array starts with the given prefix.
 *
 * @example
 * ```ts
 * import { startsWith } from "@ayonli/jsext/bytes";
 *
 * const arr = new Uint8Array([1, 2, 3, 4, 5]);
 *
 * console.log(startsWith(arr, new Uint8Array([1, 2]))); // true
 * console.log(startsWith(arr, new Uint8Array([2, 1]))); // false
 * ```
 */
function startsWith(arr, prefix) {
    return startsWith$1(arr, prefix);
}
/**
 * Checks if the byte array ends with the given suffix.
 *
 * @example
 * ```ts
 * import { endsWith } from "@ayonli/jsext/bytes";
 *
 * const arr = new Uint8Array([1, 2, 3, 4, 5]);
 *
 * console.log(endsWith(arr, new Uint8Array([4, 5]))); // true
 * console.log(endsWith(arr, new Uint8Array([5, 4]))); // false
 * ```
 */
function endsWith(arr, suffix) {
    return endsWith$1(arr, suffix);
}
/**
 * Breaks the byte array into smaller chunks according to the given delimiter.
 *
 * @example
 * ```ts
 * import { split } from "@ayonli/jsext/bytes";
 *
 * const arr = new Uint8Array([1, 2, 3, 0, 4, 5, 0, 6, 7]);
 *
 * console.log(split(arr, 0));
 * // [
 * //     Uint8Array(3) [ 1, 2, 3 ],
 * //     Uint8Array(2) [ 4, 5 ],
 * //     Uint8Array(2) [ 6, 7 ]
 * // ]
 * ```
 */
function split(arr, delimiter) {
    return split$1(arr, delimiter);
}
/**
 * Breaks the byte array into smaller chunks according to the given length.
 *
 * @example
 * ```ts
 * import { chunk } from "@ayonli/jsext/bytes";
 *
 * const arr = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
 *
 * console.log(chunk(arr, 3));
 * // [
 * //     Uint8Array(3) [ 1, 2, 3 ],
 * //     Uint8Array(3) [ 4, 5, 6 ],
 * //     Uint8Array(1) [ 7 ]
 * // ]
 * ```
 */
function chunk(arr, length) {
    return chunk$1(arr, length);
}

export { ByteArray, chunk, compare, concat, copy, bytes as default, endsWith, equals, includesSlice, indexOfSlice, split, startsWith, text };
//# sourceMappingURL=bytes.js.map
