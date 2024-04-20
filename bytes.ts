/**
 * Functions for dealing with byte arrays (`Uint8Array`).
 * @module
 */

import { equals as _equals, split as _split, chunk as _chunk } from "./array/base.ts";
import { as } from "./object.ts";
import { sum } from "./math.ts";
import { Constructor } from "./types.ts";

const defaultEncoder = new TextEncoder();
const defaultDecoder = new TextDecoder();

/**
 * A byte array is a `Uint8Array` that can be coerced to a string with `utf8`
 * encoding.
 */
export class ByteArray extends Uint8Array {
    override toString(): string {
        return text(this);
    }

    toJSON(): { type: "ByteArray"; data: number[]; } {
        return {
            type: "ByteArray",
            data: Array.from(this),
        };
    }
}

/**
 * Converts the given data to a byte array.
 * 
 * @example
 * ```ts
 * import bytes from "@ayonli/jsext/bytes";
 * 
 * const arr = bytes("Hello, World!");
 * console.log(arr); // ByteArray(13) [Uint8Array] [ 72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33 ]
 * console.log(String(arr)); // "Hello, World!"
 * ```
 */
export default function bytes(str: string): ByteArray;
export default function bytes(arr: ArrayLike<number>): ByteArray;
export default function bytes(buf: ArrayBufferLike): ByteArray;
export default function bytes(length: number): ByteArray;
export default function bytes(data: any): ByteArray {
    if (typeof data === "string") {
        return new ByteArray(defaultEncoder.encode(data).buffer);
    } else {
        return new ByteArray(data as any);
    }
}

/**
 * Converts the byte array (or `Uint8Array`) to a string.
 * @param encoding Default value: `utf8`.
 */
export function text(
    bytes: Uint8Array,
    encoding: "utf8" | "hex" | "base64" = "utf8"
): string {
    if (encoding === "hex") {
        if (typeof Buffer === "function") {
            return (as(bytes, Buffer) as Buffer ?? Buffer.from(bytes)).toString("hex");
        } else {
            return bytes.reduce((str, byte) => {
                return str + byte.toString(16).padStart(2, "0");
            }, "");
        };
    } else if (encoding === "base64") {
        if (typeof Buffer === "function") {
            return (as(bytes, Buffer) as Buffer ?? Buffer.from(bytes)).toString("base64");
        } else {
            return btoa(defaultDecoder.decode(bytes));
        }
    } else if (typeof Buffer === "function" && bytes instanceof Buffer) {
        return bytes.toString("utf8");
    } else {
        return defaultDecoder.decode(bytes);
    }
}

/** Copies bytes from `src` array to `dest` and returns the number of bytes copied. */
export function copy(src: Uint8Array, dest: Uint8Array): number {
    if (src.length > dest.length) {
        src = src.subarray(0, dest.length);
    }

    dest.set(src);
    return src.length;
}

/** Like `Buffer.concat` but for pure `Uint8Array`. */
export function concat<T extends Uint8Array>(...arrays: T[]): T {
    const length = sum(...arrays.map(arr => arr.length));
    const ctor = (arrays[0] as T).constructor as Constructor<T>;
    const result = new ctor(length);
    let offset = 0;

    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }

    return result;
}

/** Like `Buffer.compare` but for pure `Uint8Array`. */
export function compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1 {
    if (arr1 === arr2) {
        return 0;
    }

    for (let i = 0; i < arr1.length; i++) {
        const ele1 = arr1[i] as number;
        const ele2 = arr2[i];

        if (ele2 === undefined) {
            return 1;
        } else if (ele1 < ele2) {
            return -1;
        } else if (ele1 > ele2) {
            return 1;
        }
    }

    return arr1.length < arr2.length ? -1 : 0;
}

/** Checks if the two byte arrays are equal to each other. */
export function equals(arr1: Uint8Array, arr2: Uint8Array): boolean {
    if (arr1.length < 1000) {
        return _equals(arr1, arr2);
    } else if (arr1 === arr2) {
        return true;
    } else if (arr1.length !== arr2.length) {
        return false;
    }

    const len = arr1.length;
    const compressible = Math.floor(len / 4);
    const _arr1 = new Uint32Array(arr1.buffer, 0, compressible);
    const _arr2 = new Uint32Array(arr2.buffer, 0, compressible);

    for (let i = compressible * 4; i < len; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }

    for (let i = 0; i < _arr1.length; i++) {
        if (_arr1[i] !== _arr2[i]) {
            return false;
        }
    }

    return true;
}

/** Breaks the byte array into smaller chunks according to the given delimiter. */
export function split<T extends Uint8Array>(arr: T, delimiter: number): T[] {
    return _split(arr, delimiter) as T[];
}

/** Breaks the byte array into smaller chunks according to the given length. */
export function chunk<T extends Uint8Array>(arr: T, length: number): T[] {
    return _chunk(arr, length) as T[];
}
