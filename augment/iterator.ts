import {
    filterMap as _filterMap,
    dropWhile as _dropWhile,
    takeWhile as _takeWhile,
    stepBy as _stepBy,
    unique as _unique,
    uniqueBy as _uniqueBy,
    chunk as _chunk,
    partition as _partition,
    zip as _zip,
    unzip as _unzip,
    flat as _flat,
    concat as _concat,
    inspect as _inspect,
    enumerate as _enumerate,
    nth as _nth,
    last as _last,
    min as _min,
    max as _max,
    avg as _avg,
    sum as _sum,
    product as _product,
} from "../iterator.ts";

declare global {
    interface IteratorObject<T, TReturn = unknown, TNext = unknown> {
        /**
         * Returns a new iterator containing the results of applying the given predicate
         * function to each element of the iterator, filtering out any `null` or `undefined`
         * results.
         */
        filterMap<U>(fn: (item: T, i: number) => U | null | undefined): IteratorObject<U, undefined, unknown>;
        /**
         * Returns a new iterator that skips elements until the predicate function returns
         * `false`.
         */
        dropWhile(predicate: (item: T, i: number) => boolean): IteratorObject<T, undefined, unknown>;
        /**
         * Returns a new iterator that yields elements until the predicate function returns
         * `false`.
         */
        takeWhile(predicate: (item: T, i: number) => boolean): IteratorObject<T, undefined, unknown>;
        /**
         * Returns a new iterator starting at the same point, but stepping by the given
         * amount at each iteration.
         * 
         * NOTE: The first element of the iterator will always be returned, regardless
         * of the step given.
         */
        stepBy(step: number): IteratorObject<T, undefined, unknown>;
        /**
         * Returns a new iterator that contains only unique items of the given iterator.
         */
        unique(): IteratorObject<T, undefined, unknown>;
        /**
         * Returns a new iterator that contains only unique items filtered by the
         * given callback function.
         */
        uniqueBy<K>(fn: (item: T) => K): IteratorObject<T, undefined, unknown>;
        /**
         * Returns a new iterator that yields chunks of the specified size from this iterator.
         */
        chunk(size: number): IteratorObject<T[], undefined, unknown>;
        /**
         * Returns a tuple of two arrays with the first one containing all elements from
         * the iterator that match the given predicate and the second one containing
         * all that do not.
         */
        partition(predicate: (item: T, i: number) => boolean): [T[], T[]];
        /**
         * Returns a new iterator that will iterate over two other iterators, returning
         * a tuple where the first element comes from the first iterator, and the second
         * element comes from the second iterator.
         */
        zip<U>(other: IteratorObject<U>): IteratorObject<[T, U], undefined, unknown>;
        /**
         * Converts an iterator of pairs into a pair of containers.
         */
        unzip<A, B>(this: IteratorObject<[A, B], TReturn, TNext>): [A[], B[]];
        /**
         * Returns a new iterator that flattens nested structure.
         * 
         * NOTE: Unlike the `flat` method of arrays, this function only flattens one
         * level of nesting.
         */
        flat<T>(this: IteratorObject<T | T[], TReturn, TNext>): IteratorObject<T, undefined, unknown>;
        /**
         * Concatenates this iterator and other iterators into a new iterator.
         */
        concat(...others: IteratorObject<T>[]): IteratorObject<T, undefined, unknown>;
        /**
         * Do something with each element of the iterator and passing the value on.
         */
        inspect(fn: (item: T, i: number) => void): IteratorObject<T, undefined, unknown>;
        /**
         * Returns a new iterator which yields pairs `[index, value]` for each value
         * from this iterator.
         */
        enumerate(): IteratorObject<[number, T], undefined, unknown>;
        /**
         * Returns the `n`th element of the iterator. `n` starts from `0`.
         * 
         * NOTE: All preceding elements, as well as the returned element, will be consumed
         * from the iterator. That means that the preceding elements will be discarded,
         * and also that calling `nth(0)` multiple times on the same iterator will return
         * different elements.
         */
        nth(n: number): T | undefined;
        /**
         * Consumes the iterator and returns the last element, or `undefined` if the
         * iterator is empty.
         */
        last(): T | undefined;
        /**
         * Consumes the iterator and returns the minimum value, or `undefined` if the
         * iterator is empty.
         */
        min(this: IteratorObject<number | string, TReturn, TNext>): T | undefined;
        /**
         * Consumes the iterator and returns the maximum value, or `undefined` if the
         * iterator is empty.
         */
        max(this: IteratorObject<number | string, TReturn, TNext>): T | undefined;
        /**
         * Consumes the iterator and returns the average of all values, or `undefined`
         * if the iterator is empty.
         */
        avg(this: IteratorObject<number, TReturn, TNext>): number | undefined;
        /**
         * Consumes the iterator and returns the sum of all values.
         */
        sum(this: IteratorObject<number, TReturn, TNext>): number;
        /**
         * Consumes the iterator and returns the product of all values. If the iterator
         * is empty, returns `1`.
         */
        product(this: IteratorObject<number, TReturn, TNext>): number;
    }
}

if (typeof Iterator === "function") {
    Iterator.prototype.filterMap = function filterMap(fn) {
        return _filterMap(this, fn);
    };

    Iterator.prototype.dropWhile = function dropWhile(predicate) {
        return _dropWhile(this, predicate);
    };

    Iterator.prototype.takeWhile = function takeWhile(predicate) {
        return _takeWhile(this, predicate);
    };

    Iterator.prototype.stepBy = function stepBy(step) {
        return _stepBy(this, step);
    };

    Iterator.prototype.unique = function unique() {
        return _unique(this);
    };

    Iterator.prototype.uniqueBy = function uniqueBy(fn) {
        return _uniqueBy(this, fn);
    };

    Iterator.prototype.chunk = function chunk(size) {
        return _chunk(this, size);
    };

    Iterator.prototype.partition = function partition(predicate) {
        return _partition(this, predicate);
    };

    Iterator.prototype.zip = function zip(other) {
        return _zip(this, other);
    };

    Iterator.prototype.unzip = function unzip() {
        return _unzip(this);
    };

    Iterator.prototype.flat = function flat() {
        return _flat(this);
    };

    Iterator.prototype.concat = function concat(...others) {
        return _concat(this, ...others);
    };

    Iterator.prototype.inspect = function inspect(fn) {
        return _inspect(this, fn);
    };

    Iterator.prototype.enumerate = function enumerate() {
        return _enumerate(this);
    };

    Iterator.prototype.nth = function nth(n) {
        return _nth(this, n);
    };

    Iterator.prototype.last = function last() {
        return _last(this);
    };

    Iterator.prototype.min = function min() {
        return _min(this);
    };

    Iterator.prototype.max = function max() {
        return _max(this);
    };

    Iterator.prototype.avg = function avg() {
        return _avg(this);
    };

    Iterator.prototype.sum = function sum() {
        return _sum(this);
    };

    Iterator.prototype.product = function product() {
        return _product(this);
    };
}
