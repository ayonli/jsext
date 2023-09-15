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
export {};
