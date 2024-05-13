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
/** Checks if the array-like object contains the given subset. */
function hasSubset(arr, subset) {
    if (arr === subset || !subset.length) {
        return true;
    }
    const limit = arr.length;
    const subLimit = subset.length;
    if (subLimit > limit) {
        return false;
    }
    for (let i = 0; i < limit; i++) {
        if (arr[i] === subset[0]) {
            let j = 1;
            while (j < subLimit && arr[i + j] === subset[j]) {
                j++;
            }
            if (j === subLimit) {
                return true;
            }
        }
    }
    return false;
}
/** Checks if the array-like object starts with the given subset. */
function startsWith(arr, subset) {
    if (arr === subset || !subset.length) {
        return true;
    }
    const limit = arr.length;
    const preLimit = subset.length;
    if (preLimit > limit) {
        return false;
    }
    for (let i = 0; i < preLimit; i++) {
        if (arr[i] !== subset[i]) {
            return false;
        }
    }
    return true;
}
/** Checks if the array-like object ends with the given subset. */
function endsWith(arr, subset) {
    if (arr === subset || !subset.length) {
        return true;
    }
    const limit = arr.length;
    const sufLimit = subset.length;
    if (sufLimit > limit) {
        return false;
    }
    for (let i = subset.length - 1, j = arr.length - 1; i >= 0; i--, j--) {
        if (subset[i] !== arr[j]) {
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

export { chunk, count, endsWith, equals, hasSubset, split, startsWith };
//# sourceMappingURL=base.js.map
