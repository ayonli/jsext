import { compare, equals as _equals, split as _split, chunk as _chunk, concat, copy } from "./index.ts";

declare global {
    interface Uint8ArrayConstructor {
        /** Copies bytes from `src` array to `dest` and returns the number of bytes copied. */
        copy(src: Uint8Array, dest: Uint8Array): number;
        /** Like `Buffer.concat` but for pure `Uint8Array`. */
        concat<T extends Uint8Array>(...arrays: T[]): T;
        /** Like `Buffer.compare` but for pure `Uint8Array`. */
        compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1;
    }

    interface Uint8Array {
        /** Checks if the two byte arrays are equal to each other. */
        equals(another: Uint8Array): boolean;
        /** Breaks the byte array into smaller chunks according to the given delimiter. */
        split(delimiter: number): this[];
        /** Breaks the byte array into smaller chunks according to the given length. */
        chunk(length: number): this[];
    }
}

Uint8Array.copy = copy;
Uint8Array.concat = concat;
Uint8Array.compare = compare;

Uint8Array.prototype.equals = function equals(another) {
    return _equals(this, another);
};

Uint8Array.prototype.split = function split(delimiter) {
    return _split(this, delimiter);
};

Uint8Array.prototype.chunk = function chunk(length) {
    return _chunk(this, length);
};
