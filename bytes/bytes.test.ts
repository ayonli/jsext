import { deepStrictEqual, strictEqual } from "node:assert";
import bytes, { compare, concat, copy, split, text } from "./index.ts";

describe("bytes", () => {
    it("bytes", () => {
        deepStrictEqual(bytes("Hello, World!"), new TextEncoder().encode("Hello, World!"));
        deepStrictEqual(bytes([1, 2, 3, 4, 5]), new Uint8Array([1, 2, 3, 4, 5]));
        deepStrictEqual(bytes(new Uint8Array([1, 2, 3, 4, 5])), new Uint8Array([1, 2, 3, 4, 5]));
        deepStrictEqual(
            bytes(new Uint8Array([1, 2, 3, 4, 5]).buffer),
            new Uint8Array([1, 2, 3, 4, 5])
        );
        deepStrictEqual(bytes(new ArrayBuffer(5)), new Uint8Array(5));
        deepStrictEqual(bytes(5), new Uint8Array(5));
    });

    it("text", () => {
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111])), "Hello");
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111]), "utf8"), "Hello");
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111]), "base64"), "SGVsbG8=");
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111]), "hex"), "48656c6c6f");
    });

    it("copy", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array(10);
        const arr3 = new Uint8Array(3);

        strictEqual(copy(arr1, arr2), 5);
        strictEqual(copy(arr1, arr3), 3);

        deepStrictEqual(arr2, new Uint8Array([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]));
        deepStrictEqual(arr3, new Uint8Array([1, 2, 3]));

        if (typeof Buffer === "function") {
            const buf1 = Buffer.from([1, 2, 3, 4, 5]);
            const buf2 = Buffer.alloc(10);
            const buf3 = Buffer.alloc(3);

            strictEqual(copy(buf1, buf2), 5);
            strictEqual(copy(buf1, buf3), 3);

            deepStrictEqual(buf2, Buffer.from([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]));
            deepStrictEqual(buf3, Buffer.from([1, 2, 3]));
        }
    });

    it("concat", () => {
        const arr1 = new Uint8Array([1, 2, 3]);
        const arr2 = new Uint8Array([4, 5, 6]);
        const arr3 = new Uint8Array([7, 8, 9]);
        const arr = concat(arr1, arr2, arr3);

        deepStrictEqual(arr, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));

        if (typeof Buffer === "function") {
            const buf1 = Buffer.from([1, 2, 3]);
            const buf2 = Buffer.from([4, 5, 6]);
            const buf3 = Buffer.from([7, 8, 9]);
            const buf = concat(buf1, buf2, buf3);

            deepStrictEqual(buf, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]));
        }
    });

    it("compare", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr3 = new Uint8Array([1, 2, 3, 4]);
        const arr4 = new Uint8Array([2, 3, 4, 5, 6]);

        strictEqual(compare(arr1, arr1), 0);
        strictEqual(compare(arr1, arr2), 0);
        strictEqual(compare(arr1, arr3), 1);
        strictEqual(compare(arr1, arr4), -1);

        if (typeof Buffer === "function") {
            strictEqual(compare(arr1, arr2), Buffer.compare(arr1, arr2));
            strictEqual(compare(arr1, arr3), Buffer.compare(arr1, arr3));
            strictEqual(compare(arr1, arr4), Buffer.compare(arr1, arr4));
        }
    });

    it("split", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        deepStrictEqual(split(arr, 2), [
            new Uint8Array([0, 1]),
            new Uint8Array([3, 4, 5, 4, 3]),
            new Uint8Array([1]),
        ]);
        deepStrictEqual(split(arr, 5), [new Uint8Array([0, 1, 2, 3, 4]), new Uint8Array([4, 3, 2, 1])]);
        deepStrictEqual(split(arr, 1), [
            new Uint8Array([0]),
            new Uint8Array([2, 3, 4, 5, 4, 3, 2]),
            new Uint8Array([]),
        ]);

        if (typeof Buffer === "function") {
            const buf = Buffer.from([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
            deepStrictEqual(split(buf, 2), [
                Buffer.from([0, 1]),
                Buffer.from([3, 4, 5, 4, 3]),
                Buffer.from([1]),
            ]);
            deepStrictEqual(split(buf, 5), [Buffer.from([0, 1, 2, 3, 4]), Buffer.from([4, 3, 2, 1])]);
            deepStrictEqual(split(buf, 1), [
                Buffer.from([0]),
                Buffer.from([2, 3, 4, 5, 4, 3, 2]),
                Buffer.from([]),
            ]);
        }
    });
});
