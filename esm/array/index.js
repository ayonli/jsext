import { isSubclassOf } from '../mixins.js';
import { random as random$1 } from '../number/index.js';
import { count as count$1, equals as equals$1, split as split$1, chunk as chunk$1 } from './base.js';

/** Returns the first element of the array, or `undefined` if the array is empty. */
function first(arr) {
    return arr[0];
}
/** Returns the last element of the array, or `undefined` if the array is empty. */
function last(arr) {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}
/** Returns a random element of the array, or `undefined` if the array is empty. */
function random(arr, remove = false) {
    if (!arr.length) {
        return undefined;
    }
    else if (arr.length === 1) {
        if (remove) {
            return arr.splice(0, 1)[0];
        }
        else {
            return arr[0];
        }
    }
    const i = random$1(0, arr.length - 1);
    if (remove) {
        return arr.splice(i, 1)[0];
    }
    else {
        return arr[i];
    }
}
/** Counts the occurrence of the element in the array. */
function count(arr, ele) {
    return count$1(arr, ele);
}
/**
 * Performs a shallow compare to another array and see if it contains the same elements as
 * this array.
 */
function equals(arr1, arr2) {
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
/** Returns a subset of the array that contains only unique items. */
function uniq(arr) {
    return [...new Set(arr)];
}
/**
 * Returns a subset of the array that contains only unique items filtered by the
 * given callback function.
 */
function uniqBy(arr, fn) {
    const map = new Map();
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const key = fn(item, i);
        map.has(key) || map.set(key, item);
    }
    return [...map.values()];
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
    if (type === Map || isSubclassOf(type, Map)) {
        const groups = new type();
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
function keyBy(arr, fn, type = Object) {
    if (type === Map || isSubclassOf(type, Map)) {
        const map = new type();
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const key = fn(item, i);
            map.set(key, item);
        }
        return map;
    }
    else {
        const record = {};
        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const key = fn(item, i);
            record[key] = item;
        }
        return record;
    }
}

export { chunk, count, equals, first, groupBy, keyBy, last, orderBy, random, shuffle, split, uniq, uniqBy };
//# sourceMappingURL=index.js.map
