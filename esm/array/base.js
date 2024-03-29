/** Counts the occurrence of the element in the array-like object. */
function count(arr, item) {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === item) {
            count++;
        }
    }
    return count;
}
/**
 * Performs a shallow compare to another array and see if it contains the same elements as
 * this array-like object.
 */
function equals(arr1, arr2) {
    if (arr1 === arr2) {
        return true;
    }
    else if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}
/** Breaks the array-like object into smaller chunks according to the given delimiter. */
function split(arr, delimiter) {
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
/** Breaks the array-like object into smaller chunks according to the given length. */
function chunk(arr, length) {
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

export { chunk, count, equals, split };
//# sourceMappingURL=base.js.map
