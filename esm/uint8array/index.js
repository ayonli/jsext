import { equals as equals$1, split as split$1, chunk as chunk$1 } from '../array/index.js';
import { sum } from '../math/index.js';

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
/**
 * Compares this array to another array and see if it contains the same elements as
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
    return chunk$1(arr, length);
}

export { chunk, compare, concat, copy, equals, split };
//# sourceMappingURL=index.js.map
