/**
 * Functions for dealing with [iterators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator).
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
function concat(...iters) {
    let offset = 0;
    return Iterator.from({
        next(...args) {
            while (offset < iters.length) {
                const result = iters[offset].next(...args);
                if (!result.done) {
                    return result;
                }
                offset++;
            }
            return { done: true, value: undefined };
        },
        return(value) {
            var _a, _b;
            (_b = (_a = iters[offset]) === null || _a === void 0 ? void 0 : _a.return) === null || _b === void 0 ? void 0 : _b.call(_a, value);
            return { done: true, value: undefined };
        },
        throw(e) {
            var _a, _b;
            (_b = (_a = iters[offset]) === null || _a === void 0 ? void 0 : _a.throw) === null || _b === void 0 ? void 0 : _b.call(_a, e);
            throw e;
        },
    });
}
/**
 * Returns a new iterator containing the results of applying the given predicate
 * function to each element of the iterator, filtering out any `undefined`
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
function filterMap(iter, fn) {
    let i = 0;
    return Iterator.from({
        next(...args) {
            while (true) {
                const result = iter.next(...args);
                if (result.done) {
                    return result;
                }
                const mapped = fn(result.value, i++);
                if (mapped !== undefined) {
                    return { done: false, value: mapped };
                }
            }
        },
        return(value) {
            var _a;
            (_a = iter.return) === null || _a === void 0 ? void 0 : _a.call(iter, value);
            return { done: true, value: undefined };
        },
        throw(e) {
            var _a;
            (_a = iter.throw) === null || _a === void 0 ? void 0 : _a.call(iter, e);
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
function inspect(iter, fn) {
    let i = 0;
    return Iterator.from({
        next(...args) {
            const result = iter.next(...args);
            if (!result.done) {
                fn(result.value, i++);
            }
            return result;
        },
        return(value) {
            var _a;
            (_a = iter.return) === null || _a === void 0 ? void 0 : _a.call(iter, value);
            return { done: true, value: undefined };
        },
        throw(e) {
            var _a;
            (_a = iter.throw) === null || _a === void 0 ? void 0 : _a.call(iter, e);
            throw e;
        },
    });
}
/**
 * Creates an iterator starting at the same point, but stepping by the given
 * amount at each iteration.
 *
 * Note 1: The first element of the iterator will always be returned, regardless
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
function stepBy(iter, step) {
    if (step <= 0) {
        throw new RangeError("Step must be a positive integer");
    }
    let first = true;
    return Iterator.from({
        next(...args) {
            if (first) {
                first = false;
                return iter.next(...args);
            }
            let result;
            for (let i = 0; i < step; i++) {
                result = iter.next(...args);
                if (result.done) {
                    return result;
                }
            }
            return result;
        },
        return(value) {
            var _a;
            (_a = iter.return) === null || _a === void 0 ? void 0 : _a.call(iter, value);
            return { done: true, value: undefined };
        },
        throw(e) {
            var _a;
            (_a = iter.throw) === null || _a === void 0 ? void 0 : _a.call(iter, e);
            throw e;
        },
    });
}
/**
 * Returns an iterator that yields chunks of the specified size from the input
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
function chunk(iter, size) {
    return Iterator.from({
        next(..._args) {
            const chunk = nextChunk(iter, size);
            return {
                done: chunk === undefined,
                value: chunk,
            };
        },
        return(value) {
            var _a;
            (_a = iter.return) === null || _a === void 0 ? void 0 : _a.call(iter, value);
            return { done: true, value: undefined };
        },
        throw(e) {
            var _a;
            (_a = iter.throw) === null || _a === void 0 ? void 0 : _a.call(iter, e);
            throw e;
        },
    });
}
function nextChunk(iter, size) {
    if (size <= 0) {
        throw new RangeError("Chunk size must be a positive integer");
    }
    const chunk = [];
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
 * Creates a new iterator which yields pairs `[index, value]` for each value
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
function enumerate(iter) {
    let i = 0;
    return Iterator.from({
        next(...args) {
            const result = iter.next(...args);
            if (result.done) {
                return result;
            }
            return { done: false, value: [i++, result.value] };
        },
        return(value) {
            var _a;
            (_a = iter.return) === null || _a === void 0 ? void 0 : _a.call(iter, value);
            return { done: true, value: undefined };
        },
        throw(e) {
            var _a;
            (_a = iter.throw) === null || _a === void 0 ? void 0 : _a.call(iter, e);
            throw e;
        },
    });
}
/**
 * Returns a new iterator that will iterate over two other iterators, returning
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
function zip(iter1, iter2) {
    return Iterator.from({
        next(...args) {
            const result1 = iter1.next(...args);
            const result2 = iter2.next(...args);
            if (result1.done || result2.done) {
                return { done: true, value: undefined };
            }
            return { done: false, value: [result1.value, result2.value] };
        },
        return(value) {
            var _a, _b;
            (_a = iter1.return) === null || _a === void 0 ? void 0 : _a.call(iter1, value);
            (_b = iter2.return) === null || _b === void 0 ? void 0 : _b.call(iter2, value);
            return { done: true, value: undefined };
        },
        throw(e) {
            var _a, _b;
            (_a = iter1.throw) === null || _a === void 0 ? void 0 : _a.call(iter1, e);
            (_b = iter2.throw) === null || _b === void 0 ? void 0 : _b.call(iter2, e);
            throw e;
        },
    });
}

export { chunk, concat, enumerate, filterMap, inspect, stepBy, zip };
//# sourceMappingURL=iter.js.map
