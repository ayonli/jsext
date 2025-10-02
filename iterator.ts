/**
 * Functions for dealing with [iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator)
 * objects.
 * 
 * NOTE: `Iterator` is a pretty new API, requires Node.js v22+, Deno v1.39+, Bun v1.1.31+,
 * Chrome 122+, Firefox 131+, Safari 18.4+.
 * @module
 */

/**
 * Concatenates multiple iterators into a single one.
 * 
 * * @example
 * ```ts
 * import { concat } from "@ayonli/jsext/iter";
 * 
 * const iter1 = [1, 2, 3].values();
 * const iter2 = [4, 5].values();
 * const result = concat(iter1, iter2);
 * 
 * console.log([...result]); // [1, 2, 3, 4, 5]
 * ```
 */
export function concat<T>(
    ...iters: Iterator<T, unknown, undefined>[]
): IteratorObject<T, undefined, unknown> {
    let offset = 0;
    return Iterator.from({
        next(...args: [] | [undefined]) {
            while (offset < iters.length) {
                const result = iters[offset]!.next(...args);
                if (!result.done) {
                    return result;
                }
                offset++;
            }

            return { done: true, value: undefined as any };
        },
        return(value?: unknown) {
            iters[offset]?.return?.(value);
            return { done: true, value: undefined as any };
        },
        throw(e?: any) {
            iters[offset]?.throw?.(e);
            throw e;
        },
    });
}

/**
 * Returns a new iterator containing the results of applying the given predicate
 * function to each element of the iterator, filtering out any `null` or `undefined`
 * results.
 * 
 * @example
 * ```ts
 * import { filterMap } from "@ayonli/jsext/iter";
 * 
 * const iter = [1, 2, 3, 4, 5].values();
 * const result = filterMap(iter, (item) => {
 *     return item % 2 === 0 ? item * 2 : undefined;
 * });
 * 
 * console.log([...result]); // [4, 8]
 * ```
 */
export function filterMap<T, U>(
    iter: Iterator<T, unknown, undefined>,
    fn: (item: T, i: number) => U | null | undefined,
): IteratorObject<U, undefined, unknown> {
    let i = 0;
    return Iterator.from({
        next(...args: [] | [undefined]) {
            while (true) {
                const result = iter.next(...args);
                if (result.done) {
                    return result;
                }

                const mapped = fn(result.value, i++);
                if (mapped !== undefined && mapped !== null) {
                    return { done: false, value: mapped };
                }
            }
        },
        return(value?: unknown) {
            iter.return?.(value);
            return { done: true, value: undefined as any };
        },
        throw(e?: any) {
            iter.throw?.(e);
            throw e;
        },
    });
}

/**
 * Do something with each element of the iterator and passing the value on.
 * 
 * @example
 * ```ts
 * import { inspect } from "@ayonli/jsext/iter";
 * 
 * const iter = [1, 2, 3].values();
 * const intermediate = inspect(iter, (item) => {
 *     console.log("before:", item);
 * }).map((item) => item * 2);
 * const result = inspect(intermediate, (item) => {
 *     console.log("after:", item);
 * });
 * 
 * console.log([...result]); // [2, 4, 6]
 * // output:
 * // before: 1
 * // after: 2
 * // before: 2
 * // after: 4
 * // before: 3
 * // after: 6
 * ```
 */
export function inspect<T>(
    iter: Iterator<T, unknown, undefined>,
    fn: (item: T, i: number) => void
): IteratorObject<T, undefined, unknown> {
    let i = 0;
    return Iterator.from({
        next(...args: [] | [undefined]) {
            const result = iter.next(...args);
            if (!result.done) {
                fn(result.value, i++);
            }
            return result;
        },
        return(value?: unknown) {
            iter.return?.(value);
            return { done: true, value: undefined as any };
        },
        throw(e?: any) {
            iter.throw?.(e);
            throw e;
        },
    });
}

/**
 * Creates an iterator starting at the same point, but stepping by the given
 * amount at each iteration.
 * 
 * NOTE: The first element of the iterator will always be returned, regardless
 * of the step given.
 * 
 * @example
 * ```ts
 * import { stepBy } from "@ayonli/jsext/iter";
 * 
 * const iter = [1, 2, 3, 4, 5, 6, 7, 8, 9].values();
 * const stepped = stepBy(iter, 3);
 * 
 * console.log([...stepped]); // [1, 4, 7]
 * ```
 */
export function stepBy<T>(
    iter: Iterator<T, unknown, undefined>,
    step: number,
): IteratorObject<T, undefined, unknown> {
    if (step <= 0) {
        throw new RangeError("Step must be a positive integer");
    }
    let first = true;
    return Iterator.from({
        next(...args: [] | [undefined]) {
            if (first) {
                first = false;
                return iter.next(...args);
            }

            let result: IteratorResult<T, unknown>;
            for (let i = 0; i < step; i++) {
                result = iter.next(...args);
                if (result.done) {
                    return result;
                }
            }

            return result!;
        },
        return(value?: unknown) {
            iter.return?.(value);
            return { done: true, value: undefined as any };
        },
        throw(e?: any) {
            iter.throw?.(e);
            throw e;
        },
    });
}

/**
 * Creates an iterator that yields chunks of the specified size from the input
 * iterator.
 * 
 * * @example
 * ```ts
 * import { chunk } from "@ayonli/jsext/iter";
 * 
 * const iter = [1, 2, 3, 4, 5, 6, 7].values();
 * const chunked = chunk(iter, 3);
 * 
 * console.log([...chunked]); // [[1, 2, 3], [4, 5, 6], [7]]
 * ```
 */
export function chunk<T>(
    iter: Iterator<T, unknown, undefined>,
    size: number,
): IteratorObject<T[], undefined, unknown> {
    return Iterator.from({
        next(..._args: [] | [undefined]) {
            const chunk = nextChunk(iter, size);
            return {
                done: chunk === undefined,
                value: chunk,
            };
        },
        return(value?: unknown) {
            iter.return?.(value);
            return { done: true, value: undefined as any };
        },
        throw(e?: any) {
            iter.throw?.(e);
            throw e;
        },
    });
}

function nextChunk<T>(
    iter: Iterator<T, unknown, undefined>,
    size: number,
): T[] | undefined {
    if (size <= 0) {
        throw new RangeError("Chunk size must be a positive integer");
    }

    const chunk: T[] = [];
    for (let i = 0; i < size; i++) {
        const result = iter.next();
        if (result.done) {
            break;
        }
        chunk.push(result.value);
    }

    return chunk.length > 0 ? chunk : undefined;
}

/**
 * Creates an iterator which yields pairs `[index, value]` for each value
 * from the input iterator.
 * 
 * @example
 * ```ts
 * import { enumerate } from "@ayonli/jsext/iter";
 * 
 * const iter = ["a", "b", "c"].values();
 * const enumerated = enumerate(iter);
 * 
 * console.log([...enumerated]); // [[0, "a"], [1, "b"], [2, "c"]]
 * ```
 */
export function enumerate<T>(
    iter: Iterator<T, unknown, undefined>,
): IteratorObject<[number, T], undefined, unknown> {
    let i = 0;
    return Iterator.from({
        next(...args: [] | [undefined]) {
            const result = iter.next(...args);
            if (result.done) {
                return result;
            }
            return { done: false, value: [i++, result.value] };
        },
        return(value?: unknown) {
            iter.return?.(value);
            return { done: true, value: undefined as any };
        },
        throw(e?: any) {
            iter.throw?.(e);
            throw e;
        },
    });
}

/**
 * Creates an iterator that will iterate over two other iterators, returning
 * a tuple where the first element comes from the first iterator, and the second
 * element comes from the second iterator.
 * 
 * If one iterator is shorter, the resulting iterator will stop at the end of
 * the shorter iterator.
 * 
 * @example
 * ```ts
 * import { zip } from "@ayonli/jsext/iter";
 * 
 * const iter1 = [1, 2, 3].values();
 * const iter2 = ["a", "b", "c", "d"].values();
 * const zipped = zip(iter1, iter2);
 * 
 * console.log([...zipped]); // [[1, "a"], [2, "b"], [3, "c"]]
 * ```
 */
export function zip<T, U>(
    iter1: Iterator<T, unknown, undefined>,
    iter2: Iterator<U, unknown, undefined>,
): IteratorObject<[T, U], undefined, unknown> {
    return Iterator.from({
        next(...args: [] | [undefined]) {
            const result1 = iter1.next(...args);
            const result2 = iter2.next(...args);
            if (result1.done || result2.done) {
                return { done: true, value: undefined as any };
            }
            return { done: false, value: [result1.value, result2.value] };
        },
        return(value?: unknown) {
            iter1.return?.(value);
            iter2.return?.(value);
            return { done: true, value: undefined as any };
        },
        throw(e?: any) {
            iter1.throw?.(e);
            iter2.throw?.(e);
            throw e;
        },
    });
}
