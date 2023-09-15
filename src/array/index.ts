export interface RealArrayLike<T> extends ArrayLike<T> {
    slice(start?: number, end?: number): RealArrayLike<T>;
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
 * This function mutate the array.
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
 * The returned record / map has separate properties for each group, containing arrays with
 * the items in the group.
 */
export function groupBy<T>(
    arr: T[],
    fn: (item: T, i: number) => string | symbol,
    type?: ObjectConstructor
): Record<string | symbol, T[]>;
export function groupBy<T, K extends string>(
    arr: T[],
    fn: (item: T, i: number) => K,
    type: MapConstructor
): Map<K, T[]>;
export function groupBy<T>(
    arr: T[],
    fn: (item: T, i: number) => any,
    type: ObjectConstructor | MapConstructor = Object
): any {
    if (type === Map) {
        const groups = new Map<any, any[]>();

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
