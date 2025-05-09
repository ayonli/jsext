/**
 * Performs a shallow compare to another sequence and see if it contains the same elements as
 * this sequence.
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
/** Checks if the sequence contains another sequence as a slice of its contents. */
function includeSlice(arr, slice) {
    if (arr === slice || !slice.length) {
        return true;
    }
    const limit = arr.length;
    const subLimit = slice.length;
    if (subLimit > limit) {
        return false;
    }
    for (let i = 0; i < limit; i++) {
        if (arr[i] === slice[0]) {
            let j = 1;
            while (j < subLimit && arr[i + j] === slice[j]) {
                j++;
            }
            if (j === subLimit) {
                return true;
            }
        }
    }
    return false;
}
/** Checks if the sequence starts with the given prefix. */
function startsWith(arr, prefix) {
    if (arr === prefix || !prefix.length) {
        return true;
    }
    const limit = arr.length;
    const preLimit = prefix.length;
    if (preLimit > limit) {
        return false;
    }
    for (let i = 0; i < preLimit; i++) {
        if (arr[i] !== prefix[i]) {
            return false;
        }
    }
    return true;
}
/** Checks if the sequence ends with the given suffix. */
function endsWith(arr, suffix) {
    if (arr === suffix || !suffix.length) {
        return true;
    }
    const limit = arr.length;
    const sufLimit = suffix.length;
    const offset = limit - sufLimit;
    if (offset < 0) {
        return false;
    }
    for (let i = 0; i < sufLimit; i++) {
        if (arr[offset + i] !== suffix[i]) {
            return false;
        }
    }
    return true;
}
/** Breaks the sequence into smaller chunks according to the given delimiter. */
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
/** Breaks the sequence into smaller chunks according to the given length. */
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

export { chunk, endsWith, equals, includeSlice, split, startsWith };
//# sourceMappingURL=base.js.map
