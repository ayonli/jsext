import { chunk, count, equals, groupBy, orderBy, shuffle, split, uniq } from ".";

declare global {
    interface Array<T> {
        /** Returns the first element of the array, or `undefined` if the array is empty. */
        first(): T;
        /** Returns the last element of the array, or `undefined` is the array is empty. */
        last(): T;
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
         * This function mutate the array.
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

Array.prototype.first = function () {
    return this[0];
};

Array.prototype.last = function () {
    return this[this.length - 1];
};

Array.prototype.count = function (ele) {
    return count(this, ele);
};

Array.prototype.equals = function (another) {
    return equals(this, another);
};

Array.prototype.split = function (delimiter) {
    return split(this, delimiter) as any[];
};

Array.prototype.chunk = function (length) {
    return chunk(this, length) as any[];
};

Array.prototype.uniq = function () {
    return uniq(this);
};

Array.prototype.shuffle = function () {
    return shuffle(this);
};

Array.prototype.toShuffled = function () {
    return this.slice().shuffle();
};

if (!Array.prototype.toReversed) {
    Array.prototype.toReversed = function () {
        return this.slice().reverse();
    };
}

if (!Array.prototype.toSorted) {
    Array.prototype.toSorted = function (fn) {
        return this.slice().sort(fn);
    };
}

Array.prototype.orderBy = function (key, order = "asc") {
    return orderBy(this, key, order);
};

Array.prototype.groupBy = function (
    fn: (item: any, i: number) => any,
    type: ObjectConstructor | MapConstructor = Object
): any {
    return groupBy(this, fn, type as any);
};
