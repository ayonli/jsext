/** Like `Buffer.compare` but for pure `Uint8Array`. */
export declare function compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1;
/**
 * Compare this array to another array and see if it contains the same elements as
 * this array.
 */
export declare function equals(arr1: Uint8Array, arr2: Uint8Array): boolean;
/** Breaks the array into smaller chunks according to the given delimiter. */
export declare function split<T extends Uint8Array>(arr: T, delimiter: number): T[];
/** Breaks the array into smaller chunks according to the given length. */
export declare function chunk<T extends Uint8Array>(arr: T, length: number): T[];
