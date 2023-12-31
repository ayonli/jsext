import { isSubclassOf } from "../mixins.ts";
import { random as rand } from "../number/index.ts";

export interface RealArrayLike<T> extends ArrayLike<T> {
    slice(start?: number, end?: number): RealArrayLike<T>;
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
export function count<T>(arr: RealArrayLike<T>, ele: T): number {
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
export function equals<T>(arr1: RealArrayLike<T>, arr2: RealArrayLike<T>): boolean {
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
export function split<T>(arr: RealArrayLike<T>, delimiter: T): RealArrayLike<T>[] {
    const chunks: (typeof arr)[] = [];
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
    } else if (offset === limit) {
        const ctor = arr.constructor as (new (...args: any[]) => RealArrayLike<T>) & {
            from?: (iterable: Iterable<T>) => RealArrayLike<T>;
        };

        if (typeof ctor.from === "function") {
            chunks.push(ctor.from([]));
        } else {
            chunks.push(new ctor([]));
        }
    }

    return chunks;
}

/** Breaks the array into smaller chunks according to the given length. */
export function chunk<T>(arr: RealArrayLike<T>, length: number): RealArrayLike<T>[] {
    const limit = arr.length;
    const size = Math.ceil(limit / length);
    const chunks = new Array<RealArrayLike<T>>(size);
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
export function uniq<T>(arr: T[]): T[] {
    return [...new Set(arr)];
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
export function groupBy<T>(
    arr: T[],
    fn: (item: T, i: number) => any,
    type: ObjectConstructor | MapConstructor = Object
): any {
    if (type === Map || isSubclassOf(type, Map)) {
        const groups = new (type as MapConstructor)<any, any[]>();

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const key = fn(item as T, i);
            const list = groups.get(key);

            if (list) {
                list.push(item);
            } else {
                groups.set(key, [item]);
            }
        }

        return groups;
    } else {
        const groups: Record<string | symbol, any[]> = {};

        for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const key = fn(item as T, i);
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
        return arr.reduce((map, item, i) => {
            return map.set(fn(item, i), item);
        }, new type() as Map<any, any>);
    } else {
        return arr.reduce((record, item, i) => {
            const key = fn(item, i) as string | number | symbol;
            record[key] = item;
            return record;
        }, {} as Record<string | number | symbol, T>);
    }
}
