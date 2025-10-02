import {
    concat as _concat,
    filterMap as _filterMap,
    inspect as _inspect,
    stepBy as _stepBy,
    chunk as _chunk,
    enumerate as _enumerate,
    zip as _zip,
} from "../iter.ts";

declare global {
    interface IteratorObject<T, TReturn, TNext> {
        concat(...others: Iterator<T>[]): IteratorObject<T, undefined, unknown>;
        filterMap<U>(fn: (item: T, i: number) => U | undefined): IteratorObject<U, undefined, unknown>;
        inspect(fn: (item: T) => void): IteratorObject<T, undefined, unknown>;
        stepBy(step: number): IteratorObject<T, undefined, unknown>;
        chunk(size: number): IteratorObject<T[], undefined, unknown>;
        enumerate(): IteratorObject<[number, T], undefined, unknown>;
        zip<U>(other: IteratorObject<U, unknown, undefined>): IteratorObject<[T, U], undefined, unknown>;
    }
}

if (typeof Iterator === "function") {
    Iterator.prototype.concat = function concat(...others: Iterator<any>[]) {
        return _concat(this, ...others);
    };

    Iterator.prototype.filterMap = function filterMap<U>(fn: (item: any, i: number) => U | undefined) {
        return _filterMap(this, fn);
    };

    Iterator.prototype.inspect = function inspect(fn: (item: any) => void) {
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
