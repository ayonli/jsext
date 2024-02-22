import { isSubclassOf } from "../mixins.ts";
import { random as rand } from "../number/index.ts";
import {
    count as _count,
    equals as _equals,
    split as _split,
    chunk as _chunk,
} from "./base.ts";

/** Returns the first element of the array, or `undefined` if the array is empty. */
export function first<T>(arr: T[]): T | undefined {
    return arr[0];
}

/** Returns the last element of the array, or `undefined` if the array is empty. */
export function last<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[arr.length - 1] : undefined;
}

/** Returns a random element of the array, or `undefined` if the array is empty. */
export function random<T>(arr: T[], remove = false): T | undefined {
    if (!arr.length) {
        return undefined;
    } else if (arr.length === 1) {
        if (remove) {
            return arr.splice(0, 1)[0];
        } else {
            return arr[0];
        }
    }

    const i = rand(0, arr.length - 1);

    if (remove) {
        return arr.splice(i, 1)[0];
    } else {
        return arr[i];
    }
}

/** Counts the occurrence of the element in the array. */
export function count<T>(arr: T[], ele: T): number {
    return _count(arr, ele);
}

/**
 * Performs a shallow compare to another array and see if it contains the same elements as
 * this array.
 */
export function equals<T>(arr1: T[], arr2: T[]): boolean {
    return _equals(arr1, arr2);
}

/** Breaks the array into smaller chunks according to the given delimiter. */
export function split<T>(arr: T[], delimiter: T): T[][] {
    return _split(arr, delimiter) as T[][];
}

/** Breaks the array into smaller chunks according to the given length. */
export function chunk<T>(arr: T[], length: number): T[][] {
    return _chunk(arr, length) as T[][];
}

/** Returns a subset of the array that contains only unique items. */
export function uniq<T>(arr: T[]): T[] {
    return [...new Set(arr)];
}

/**
 * Returns a subset of the array that contains only unique items filtered by the
 * given callback function.
 */
export function uniqBy<T, K extends string | number | symbol>(
    arr: T[],
    fn: (item: T, i: number) => K
): T[] {
    const map = new Map() as Map<K, T>;

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i] as T;
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
export function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
    }

    return arr;
}

/**
 * Orders the items of the array according to the specified comparable `key` (whose value
 * must either be a numeric or string).
 */
export function orderBy<T>(arr: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] {
    const items = arr.slice();
    items.sort((a, b) => {
        if (typeof a !== "object" || typeof b !== "object" ||
            !a || !b ||
            Array.isArray(a) || Array.isArray(b)
        ) {
            return -1;
        }

        const _a = a[key];
        const _b = b[key];

        if (_a === undefined || _b === undefined) {
            return -1;
        }

        if (typeof _a === "number" && typeof _b === "number") {
            return _a - _b;
        } else if ((typeof _a === "string" && typeof _b === "string")
            || (typeof _a === "bigint" && typeof _b === "bigint")
        ) {
            if (_a < _b) {
                return -1;
            } else if (_a > _b) {
                return 1;
            } else {
                return 1;
            }
        } else {
            return -1;
        }
    });

    if (order === "desc") {
        items.reverse();
    }

    return items;
};

/**
 * Groups the items of the array according to the comparable values returned by a provided
 * callback function.
 * 
 * The returned record / map has separate properties for each group, containing arrays with
 * the items in the group.
 */
export function groupBy<T, K extends string | number | symbol>(
    arr: T[],
    fn: (item: T, i: number) => K,
    type?: ObjectConstructor
): Record<K, T[]>;
export function groupBy<T, K>(
    arr: T[],
    fn: (item: T, i: number) => K,
    type: MapConstructor
): Map<K, T[]>;
export function groupBy<T, K>(
    arr: T[],
    fn: (item: T, i: number) => K,
    type: ObjectConstructor | MapConstructor = Object
): any {
    if (type === Map || isSubclassOf(type, Map)) {
        const groups = new type() as Map<any, T[]>;

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i] as T;
            const key = fn(item, i);
            const list = groups.get(key);

            if (list) {
                list.push(item);
            } else {
                groups.set(key, [item]);
            }
        }

        return groups;
    } else {
        const groups: Record<string | number | symbol, T[]> = {};

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i] as T;
            const key = fn(item, i) as string | number | symbol;
            const list = groups[key];

            if (list) {
                list.push(item);
            } else {
                groups[key] = [item];
            }
        }

        return groups;
    }
};

/**
 * Creates a record or map from the items of the array according to the comparable values
 * returned by a provided callback function.
 * 
 * This function is similar to {@link groupBy} except it overrides values if the same
 * property already exists instead of grouping them as a list.
 */
export function keyBy<T, K extends string | number | symbol>(
    arr: T[],
    fn: (item: T, i: number) => K,
    type?: ObjectConstructor
): Record<K, T>;
export function keyBy<T, K>(
    arr: T[],
    fn: (item: T, i: number) => K,
    type: MapConstructor
): Map<K, T>;
export function keyBy<T, K>(
    arr: T[],
    fn: (item: T, i: number) => K,
    type: ObjectConstructor | MapConstructor = Object
): Record<string | number | symbol, T> | Map<K, T> {
    if (type === Map || isSubclassOf(type, Map)) {
        const map = new type() as Map<any, T>;

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i] as T;
            const key = fn(item, i);
            map.set(key, item);
        }

        return map;
    } else {
        const record = {} as Record<string | number | symbol, T>;

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i] as T;
            const key = fn(item, i) as string | number | symbol;
            record[key] = item;
        }

        return record;
    }
}
