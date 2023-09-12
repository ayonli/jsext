import { chunk, compare, equals, split } from ".";

declare global {
    interface Uint8ArrayConstructor {
        /** Like `Buffer.compare` but for pure `Uint8Array`. */
        compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1;
    }

    interface Uint8Array {
        /**
         * Compare this array to another array and see if it contains the same elements as
         * this array.
         */
        equals(another: Uint8Array): boolean;
        /** Breaks the array into smaller chunks according to the given delimiter. */
        split(delimiter: number): this[];
        /** Breaks the array into smaller chunks according to the given length. */
        chunk(length: number): this[];
    }
}

Uint8Array.compare = compare;

Uint8Array.prototype.equals = function (another) {
    return equals(this, another);
};

Uint8Array.prototype.split = function (delimiter) {
    return split(this, delimiter);
};

Uint8Array.prototype.chunk = function (length) {
    return chunk(this, length);
};
