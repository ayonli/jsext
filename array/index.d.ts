export interface RealArrayLike<T> extends ArrayLike<T> {
    slice(start?: number, end?: number): RealArrayLike<T>;
}
/** Counts the occurrence of the element in the array. */
export declare function count<T>(arr: RealArrayLike<T>, ele: T): number;
/**
 * Performs a shallow compare to another array and see if it contains the same elements as
 * this array.
 */
export declare function equals<T>(arr1: RealArrayLike<T>, arr2: RealArrayLike<T>): boolean;
/** Breaks the array into smaller chunks according to the given delimiter. */
export declare function split<T>(arr: RealArrayLike<T>, delimiter: T): RealArrayLike<T>[];
/** Breaks the array into smaller chunks according to the given length. */
export declare function chunk<T>(arr: RealArrayLike<T>, length: number): RealArrayLike<T>[];
/** Returns a subset of the array that contains only unique items. */
export declare function uniq<T>(arr: T[]): T[];
/**
 * Reorganizes the elements in the array in random order.
 *
 * This function mutate the array.
 */
export declare function shuffle<T>(arr: T[]): T[];
/**
 * Orders the items of the array according to the specified comparable `key` (whose value
 * must either be a numeric or string).
 */
export declare function orderBy<T>(arr: T[], key: keyof T, order?: "asc" | "desc"): T[];
/**
 * Groups the items of the array according to the comparable values returned by a provided
 * callback function.
 * The returned record / map has separate properties for each group, containing arrays with
 * the items in the group.
 */
export declare function groupBy<T>(arr: T[], fn: (item: T, i: number) => string | symbol, type?: ObjectConstructor): Record<string | symbol, T[]>;
export declare function groupBy<T, K extends string>(arr: T[], fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T[]>;
