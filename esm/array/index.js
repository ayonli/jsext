/** Counts the occurrence of the element in the array. */
function count(arr, ele) {
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
function equals(arr1, arr2) {
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
/** Breaks the array into smaller chunks according to the given length. */
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

export { chunk, count, equals, groupBy, orderBy, shuffle, split, uniq };
//# sourceMappingURL=index.js.map
