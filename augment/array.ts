import {
    first as _first,
    last as _last,
    chunk as _chunk,
    count as _count,
    equals as _equals,
    groupBy as _groupBy,
    keyBy as _keyBy,
    orderBy as _orderBy,
    random as _random,
    shuffle as _shuffle,
    split as _split,
    uniq as _uniq,
    uniqBy as _uniqBy,
} from "../array.ts";

declare global {
    interface Array<T> {
        /** Returns the first element of the array, or `undefined` if the array is empty. */
        first(): T | undefined;
        /** Returns the last element of the array, or `undefined` if the array is empty. */
        last(): T | undefined;
        /** Returns a random element of the array, or `undefined` if the array is empty. */
        random(remove?: boolean): T | undefined;
        /** Counts the occurrence of the element in the array. */
        count(item: T): number;
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
         * Returns a subset of the array that contains only unique items filtered by the
         * given callback function.
         */
        uniqBy<K extends string | number | symbol>(fn: (item: T, i: number) => K): T[];
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
        /** Orders the items of the array according to the given callback function. */
        orderBy(fn: (item: T, i: number) => string | number | bigint, order?: "asc" | "desc"): T[];
        /**
         * Groups the items of the array according to the comparable values returned by a provided
         * callback function.
         * 
         * The returned record / map has separate properties for each group, containing arrays with
         * the items in the group.
         */
        groupBy<K extends string | number | symbol>(fn: (item: T, i: number) => K, type?: ObjectConstructor): Record<K, T[]>;
        groupBy<K>(fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T[]>;
        /**
         * Creates a record or map from the items of the array according to the comparable values
         * returned by a provided callback function.
         * 
         * This function is similar to {@link groupBy} except it overrides values if the same
         * property already exists instead of grouping them as a list.
         */
        keyBy<K extends string | number | symbol>(fn: (item: T, i: number) => K, type?: ObjectConstructor): Record<K, T>;
        keyBy<K>(fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T>;
    }
}

Array.prototype.first = function first() {
    return _first(this);
};

Array.prototype.last = function last() {
    return _last(this);
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
    return _split(this, delimiter);
};

Array.prototype.chunk = function chunk(length) {
    return _chunk(this, length);
};

Array.prototype.uniq = function uniq() {
    return _uniq(this);
};

Array.prototype.uniqBy = function uniqBy(fn) {
    return _uniqBy(this, fn);
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
    return _orderBy(this, key as any, order);
};

Array.prototype.groupBy = function groupBy(
    fn: (item: any, i: number) => any,
    type: ObjectConstructor | MapConstructor = Object
): any {
    return _groupBy(this, fn, type as any);
};

Array.prototype.keyBy = function keyBy(
    fn: (item: any, i: number) => any,
    type: ObjectConstructor | MapConstructor = Object
): any {
    return _keyBy(this, fn, type as any);
};