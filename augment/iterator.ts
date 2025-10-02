import {
    concat as _concat,
    filterMap as _filterMap,
    inspect as _inspect,
    stepBy as _stepBy,
    chunk as _chunk,
    enumerate as _enumerate,
    zip as _zip,
} from "../iterator.ts";

declare global {
    interface IteratorObject<T, TReturn, TNext> {
        /**
         * Concatenates this iterator and other iterators into a new iterator.
         */
        concat(...others: Iterator<T>[]): IteratorObject<T, undefined, unknown>;
        /**
         * Returns a new iterator containing the results of applying the given predicate
         * function to each element of the iterator, filtering out any `null` or `undefined`
         * results.
         */
        filterMap<U>(fn: (item: T, i: number) => U | null | undefined): IteratorObject<U, undefined, unknown>;
        /**
         * Do something with each element of the iterator and passing the value on.
         */
        inspect(fn: (item: T, i: number) => void): IteratorObject<T, undefined, unknown>;
        /**
         * Creates an iterator starting at the same point, but stepping by the given
         * amount at each iteration.
         * 
         * NOTE: The first element of the iterator will always be returned, regardless
         * of the step given.
         */
        stepBy(step: number): IteratorObject<T, undefined, unknown>;
        /**
         * Creates an iterator that yields chunks of the specified size from this iterator.
         */
        chunk(size: number): IteratorObject<T[], undefined, unknown>;
        /**
         * Creates an iterator which yields pairs `[index, value]` for each value
         * from this iterator.
         */
        enumerate(): IteratorObject<[number, T], undefined, unknown>;
        /**
         * Creates an iterator that will iterate over two other iterators, returning
         * a tuple where the first element comes from the first iterator, and the second
         * element comes from the second iterator.
         */
        zip<U>(other: IteratorObject<U, unknown, undefined>): IteratorObject<[T, U], undefined, unknown>;
    }
}

if (typeof Iterator === "function") {
    Iterator.prototype.concat = function concat(...others: Iterator<any>[]) {
        return _concat(this, ...others);
    };

    Iterator.prototype.filterMap = function filterMap<U>(fn: (item: any, i: number) => U | null | undefined) {
        return _filterMap(this, fn);
    };

    Iterator.prototype.inspect = function inspect(fn: (item: any, i: number) => void) {
        return _inspect(this, fn);
    };

    Iterator.prototype.stepBy = function stepBy(step: number) {
        return _stepBy(this, step);
    };

    Iterator.prototype.chunk = function chunk(size: number) {
        return _chunk(this, size);
    };

    Iterator.prototype.enumerate = function enumerate() {
        return _enumerate(this);
    };

    Iterator.prototype.zip = function zip<U>(other: Iterator<U, unknown, undefined>) {
        return _zip(this, other);
    };
}
