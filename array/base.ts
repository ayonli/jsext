import { Constructor, Sequence } from "@jsext/types";

/**
 * Performs a shallow compare to another sequence and see if it contains the same elements as
 * this sequence.
 */
export function equals<T>(arr1: Sequence<T>, arr2: Sequence<T>): boolean {
    if (arr1 === arr2) {
        return true;
    } else if (arr1.length !== arr2.length) {
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
export function includeSlice<T>(arr: Sequence<T>, slice: Sequence<T>): boolean {
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
export function startsWith<T>(arr: Sequence<T>, prefix: Sequence<T>): boolean {
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
export function endsWith<T>(arr: Sequence<T>, suffix: Sequence<T>): boolean {
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
export function split<T>(arr: Sequence<T>, delimiter: T): Sequence<T>[] {
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
        const ctor = arr.constructor as Constructor<Sequence<T>> & {
            from?: (iterable: Iterable<T>) => Sequence<T>;
        };

        if (typeof ctor.from === "function") {
            chunks.push(ctor.from([]));
        } else {
            chunks.push(new ctor([]));
        }
    }

    return chunks;
}

/** Breaks the sequence into smaller chunks according to the given length. */
export function chunk<T>(arr: Sequence<T>, length: number): Sequence<T>[] {
    const limit = arr.length;
    const size = Math.ceil(limit / length);
    const chunks = new Array<Sequence<T>>(size);
    let offset = 0;
    let idx = 0;

    while (offset < limit) {
        chunks[idx] = arr.slice(offset, offset + length);
        offset += length;
        idx++;
    }

    return chunks;
}
