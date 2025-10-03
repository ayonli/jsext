/**
 * Functions for dealing with [iterator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator)
 * objects.
 *
 * NOTE: `Iterator` is a pretty new API, requires Node.js v22+, Deno v1.39+, Bun v1.1.31+,
 * Chrome 122+, Firefox 131+, Safari 18.4+.
 * @module
 */
/**
 * Returns a new iterator containing the results of applying the given predicate
 * function to each element of the iterator, filtering out any `null` or `undefined`
 * results.
 *
 * @example
 * ```ts
 * import { filterMap } from "@ayonli/jsext/iterator";
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
                if (mapped !== undefined && mapped !== null) {
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
 * Returns a new iterator that skips elements until the predicate function returns
 * `false`.
 *
 * @example
 * ```ts
 * import { dropWhile } from "@ayonli/jsext/iterator";
 *
 * const iter = [1, 2, 3, 4, 5].values();
 * const dropped = dropWhile(iter, (item) => item < 3);
 *
 * console.log([...dropped]); // [3, 4, 5]
 * ```
 */
function dropWhile(iter, predicate) {
    let flag = true;
    let i = 0;
    return Iterator.from({
        next(...args) {
            while (true) {
                const result = iter.next(...args);
                if (result.done) {
                    return result;
                }
                flag = predicate(result.value, i++);
                if (!flag) {
                    return result;
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
 * Returns a new iterator that yields elements until the predicate function returns
 * `false`.
 *
 * @example
 * ```ts
 * import { takeWhile } from "@ayonli/jsext/iterator";
 *
 * const iter = [1, 2, 3, 4, 5].values();
 * const taken = takeWhile(iter, (item) => item < 4);
 *
 * console.log([...taken]); // [1, 2, 3]
 * ```
 */
function takeWhile(iter, predicate) {
    let flag = true;
    let i = 0;
    return Iterator.from({
        next(...args) {
            if (!flag) {
                return { done: true, value: undefined };
            }
            const result = iter.next(...args);
            if (result.done) {
                return result;
            }
            if (predicate(result.value, i++)) {
                return { done: false, value: result.value };
            }
            else {
                flag = false;
                return { done: true, value: undefined };
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
 * Returns a new iterator starting at the same point, but stepping by the given
 * amount at each iteration.
 *
 * NOTE: The first element of the iterator will always be returned, regardless
 * of the step given.
 *
 * @example
 * ```ts
 * import { stepBy } from "@ayonli/jsext/iterator";
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
 * Returns a new iterator that contains only unique items of the given iterator.
 *
 * @example
 * ```ts
 * import { unique } from "@ayonli/jsext/iterator";
 *
 * const iter = [1, 2, 2, 3, 3, 3].values();
 * const uniqueIter = unique(iter);
 *
 * console.log([...uniqueIter]); // [1, 2, 3]
 * ```
 */
function unique(iter) {
    return Iterator.from(new Set(iter).values());
}
/**
 * Returns a new iterator that contains only unique items filtered by the
 * given callback function.
 *
 * @example
 * ```ts
 * import { uniqueBy } from "@ayonli/jsext/iterator";
 *
 * const iter = [
 *     { id: 1, name: "Alice" },
 *     { id: 2, name: "Bob" },
 *     { id: 1, name: "Charlie" },
 *     { id: 3, name: "David" },
 *     { id: 2, name: "Eve" },
 * ].values();
 * const uniqueIter = uniqueBy(iter, (item) => item.id);
 *
 * console.log([...uniqueIter]);
 * // [
 * //     { id: 1, name: "Alice" },
 * //     { id: 2, name: "Bob" },
 * //     { id: 3, name: "David" },
 * // ]
 * ```
 */
function uniqueBy(iter, fn) {
    const map = new Map();
    let i = 0;
    while (true) {
        const result = iter.next();
        if (result.done) {
            break;
        }
        const key = fn(result.value, i++);
        map.has(key) || map.set(key, result.value);
    }
    return Iterator.from(map.values());
}
/**
 * Returns a new iterator that yields chunks of the specified size from the input
 * iterator.
 *
 * * @example
 * ```ts
 * import { chunk } from "@ayonli/jsext/iterator";
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
 * Returns a tuple of two arrays with the first one containing all elements from
 * the iterator that match the given predicate and the second one containing
 * all that do not.
 *
 * @example
 * ```ts
 * import { partition } from "@ayonli/jsext/iterator";
 *
 * const iter = [1, 2, 3, 4, 5].values();
 * const [even, odd] = partition(iter, (item) => item % 2 === 0);
 *
 * console.log(even); // [2, 4]
 * console.log(odd);  // [1, 3, 5]
 * ```
 */
function partition(iter, predicate) {
    const match = [];
    const rest = [];
    let i = 0;
    while (true) {
        const result = iter.next();
        if (result.done) {
            break;
        }
        if (predicate(result.value, i++)) {
            match.push(result.value);
        }
        else {
            rest.push(result.value);
        }
    }
    return [match, rest];
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
 * import { zip } from "@ayonli/jsext/iterator";
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
/**
 * Converts an iterator of pairs into a pair of containers.
 *
 * @example
 * ```ts
 * import { unzip } from "@ayonli/jsext/iterator";
 *
 * const iter = [[1, "a"], [2, "b"], [3, "c"]].values();
 * const [numbers, letters] = unzip(iter);
 *
 * console.log(numbers); // [1, 2, 3]
 * console.log(letters); // ["a", "b", "c"]
 * ```
 */
function unzip(iter) {
    const arr1 = [];
    const arr2 = [];
    while (true) {
        const result = iter.next();
        if (result.done) {
            break;
        }
        const [val1, val2] = result.value;
        arr1.push(val1);
        arr2.push(val2);
    }
    return [arr1, arr2];
}
/**
 * Returns a new iterator that flattens nested structure.
 *
 * NOTE: Unlike the `flat` method of arrays, this function only flattens one
 * level of nesting.
 *
 * @example
 * ```ts
 * import { flat } from "@ayonli/jsext/iterator";
 *
 * const iter = [1, [2, 3], 4, [5, 6]].values();
 * const flattened = flat(iter);
 *
 * console.log([...flattened]); // [1, 2, 3, 4, 5, 6]
 * ```
 */
function flat(iter) {
    let inner = null;
    let innerIndex = 0;
    return Iterator.from({
        next(...args) {
            while (true) {
                if (inner) {
                    if (innerIndex < inner.length) {
                        return { done: false, value: inner[innerIndex++] };
                    }
                    else {
                        inner = null;
                        innerIndex = 0;
                    }
                }
                const result = iter.next(...args);
                if (result.done) {
                    return result;
                }
                if (Array.isArray(result.value)) {
                    inner = result.value;
                    innerIndex = 0;
                    continue;
                }
                else {
                    return { done: false, value: result.value };
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
 * Concatenates multiple iterators into a single one.
 *
 * * @example
 * ```ts
 * import { concat } from "@ayonli/jsext/iterator";
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
 * Do something with each element of the iterator and passing the value on.
 *
 * @example
 * ```ts
 * import { inspect } from "@ayonli/jsext/iterator";
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
 * Returns a new iterator which yields pairs `[index, value]` for each value
 * from the input iterator.
 *
 * @example
 * ```ts
 * import { enumerate } from "@ayonli/jsext/iterator";
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
 * Returns the `n`th element of the iterator. `n` starts from `0`.
 *
 * NOTE: All preceding elements, as well as the returned element, will be consumed
 * from the iterator. That means that the preceding elements will be discarded,
 * and also that calling `nth(0)` multiple times on the same iterator will return
 * different elements.
 *
 * @example
 * ```ts
 * import { nth } from "@ayonli/jsext/iterator";
 *
 * const iter1 = [1, 2, 3].values();
 * const iter2 = [1, 2, 3].values();
 *
 * console.log(nth(iter1, 1)); // 2
 * console.log(nth(iter2, 5)); // undefined
 * ```
 */
function nth(iter, n) {
    if (n < 0) {
        return undefined;
    }
    let index = 0;
    while (true) {
        const result = iter.next();
        if (result.done) {
            return undefined;
        }
        if (index++ === n) {
            return result.value;
        }
    }
}
/**
 * Consumes the iterator and returns the last element, or `undefined` if the
 * iterator is empty.
 *
 * @example
 * ```ts
 * import { last } from "@ayonli/jsext/iterator";
 *
 * const iter1 = [1, 2, 3].values();
 * const iter2 = [].values();
 *
 * console.log(last(iter1)); // 3
 * console.log(last(iter2)); // undefined
 * ```
 */
function last(iter) {
    let lastValue = undefined;
    while (true) {
        const result = iter.next();
        if (result.done) {
            break;
        }
        lastValue = result.value;
    }
    return lastValue;
}
/**
 * Consumes the iterator and returns the minimum value, or `undefined` if the
 * iterator is empty.
 *
 * @example
 * ```ts
 * import { min } from "@ayonli/jsext/iterator";
 *
 * const iter1 = [3, 1, 4, 1, 5, 9].values();
 * const iter2 = [].values();
 *
 * console.log(min(iter)); // 1
 * console.log(min(iter2)); // undefined
 * ```
 */
function min(iter) {
    let current = undefined;
    while (true) {
        const result = iter.next();
        if (result.done) {
            break;
        }
        if (current === undefined || result.value < current) {
            current = result.value;
        }
    }
    return current;
}
/**
 * Consumes the iterator and returns the maximum value, or `undefined` if the
 * iterator is empty.
 *
 * @example
 * ```ts
 * import { max } from "@ayonli/jsext/iterator";
 *
 * const iter1 = [3, 1, 4, 1, 5, 9].values();
 * const iter2 = [].values();
 *
 * console.log(max(iter)); // 9
 * console.log(max(iter2)); // undefined
 * ```
 */
function max(iter) {
    let current = undefined;
    while (true) {
        const result = iter.next();
        if (result.done) {
            break;
        }
        if (current === undefined || result.value > current) {
            current = result.value;
        }
    }
    return current;
}
/**
 * Consumes the iterator and returns the average of all values, or `undefined`
 * if the iterator is empty.
 *
 * @example
 * ```ts
 * import { avg } from "@ayonli/jsext/iterator";
 *
 * const iter1 = [1, 2, 3, 4, 5].values();
 * const iter2 = [].values();
 *
 * console.log(avg(iter1)); // 3
 * console.log(avg(iter2)); // undefined
 * ```
 */
function avg(iter) {
    let count = 0;
    const total = iter.reduce((acc, val) => {
        count++;
        return acc + val;
    }, 0);
    return count === 0 ? undefined : total / count;
}
/**
 * Consumes the iterator and returns the sum of all values.
 *
 * @example
 * ```ts
 * import { sum } from "@ayonli/jsext/iterator";
 *
 * const iter1 = [1, 2, 3, 4, 5].values();
 * const iter2 = [].values();
 *
 * console.log(sum(iter1)); // 15
 * console.log(sum(iter2)); // 0
 * ```
 */
function sum(iter) {
    return iter.reduce((acc, val) => acc + val, 0);
}
/**
 * Consumes the iterator and returns the product of all values. If the iterator
 * is empty, returns `1`.
 *
 * @example
 * ```ts
 * import { product } from "@ayonli/jsext/iterator";
 *
 * const iter1 = [1, 2, 3, 4].values();
 * const iter2 = [].values();
 *
 * console.log(product(iter1)); // 24
 * console.log(product(iter2)); // 1
 * ```
 */
function product(iter) {
    return iter.reduce((acc, val) => acc * val, 1);
}

export { avg, chunk, concat, dropWhile, enumerate, filterMap, flat, inspect, last, max, min, nth, partition, product, stepBy, sum, takeWhile, unique, uniqueBy, unzip, zip };
//# sourceMappingURL=iterator.js.map
