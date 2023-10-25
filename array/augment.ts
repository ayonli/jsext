import {
    chunk as _chunk,
    count as _count,
    equals as _equals,
    groupBy as _groupBy,
    orderBy as _orderBy,
    random as _random,
    shuffle as _shuffle,
    split as _split,
    uniq as _uniq
} from "./index.ts";

declare global {
    interface Array<T> {
        /** Returns the first element of the array, or `undefined` if the array is empty. */
        first(): T | undefined;
        /** Returns the last element of the array, or `undefined` if the array is empty. */
        last(): T | undefined;
        /** Returns a random element of the array, or `undefined` if the array is empty. */
        random(remove?: boolean): T | undefined;
        /** Counts the occurrence of the element in the array. */
        count(ele: T): number;
        /**
         * Performs a shallow compare to another array and see if it contains the same elements as
         * this array.
         */
        equals(another: T[]): boolean;
        /** Breaks the array into smaller chunks according to the given delimiter. */
        split(delimiter: T): T[][];
        /** Breaks the array into smaller chunks according to the given length. */
        chunk(length: number): T[][];
        /** Returns a subset of the array that contains only unique items. */
        uniq(): T[];
        /**
         * Reorganizes the elements in the array in random order.
         * 
         * This function mutates the array.
         */
        shuffle(): T[];
        toShuffled(): T[];
        toReversed(): T[];
        toSorted(fn?: ((a: T, b: T) => number) | undefined): T[];
        /**
         * Orders the items of the array according to the specified comparable `key` (whose value
         * must either be a numeric or string).
         */
        orderBy(key: keyof T, order?: "asc" | "desc"): T[];
        /**
         * Groups the items of the array according to the comparable values returned by a provided
         * callback function.
         * The returned record / map has separate properties for each group, containing arrays with
         * the items in the group.
         */
        groupBy(fn: (item: T, i: number) => string | symbol, type?: ObjectConstructor): Record<string | symbol, T[]>;
        groupBy<K>(fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T[]>;
    }
}

Array.prototype.first = function first() {
    return this[0];
};

Array.prototype.last = function last() {
    return this[this.length - 1];
};

Array.prototype.random = function random(remove = false) {
    return _random(this, remove);
};

Array.prototype.count = function count(ele) {
    return _count(this, ele);
};

Array.prototype.equals = function equals(another) {
    return _equals(this, another);
};

Array.prototype.split = function split(delimiter) {
    return _split(this, delimiter) as any[];
};

Array.prototype.chunk = function chunk(length) {
    return _chunk(this, length) as any[];
};

Array.prototype.uniq = function uniq() {
    return _uniq(this);
};

Array.prototype.shuffle = function shuffle() {
    return _shuffle(this);
};

Array.prototype.toShuffled = function toShuffled() {
    return this.slice().shuffle();
};

if (!Array.prototype.toReversed) {
    Array.prototype.toReversed = function toReversed() {
        return this.slice().reverse();
    };
}

if (!Array.prototype.toSorted) {
    Array.prototype.toSorted = function toSorted(fn) {
        return this.slice().sort(fn);
    };
}

Array.prototype.orderBy = function orderBy(key, order = "asc") {
    return _orderBy(this, key, order);
};

Array.prototype.groupBy = function orderBy(
    fn: (item: any, i: number) => any,
    type: ObjectConstructor | MapConstructor = Object
): any {
    return _groupBy(this, fn, type as any);
};
