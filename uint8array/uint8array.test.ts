import "../augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";

describe("Uint8Array", () => {
    it("Uint8Array.copy", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array(10);
        const arr3 = new Uint8Array(3);

        strictEqual(Uint8Array.copy(arr1, arr2), 5);
        strictEqual(Uint8Array.copy(arr1, arr3), 3);

        deepStrictEqual(arr2, new Uint8Array([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]));
        deepStrictEqual(arr3, new Uint8Array([1, 2, 3]));

        if (typeof Buffer === "function") {
            const buf1 = Buffer.from([1, 2, 3, 4, 5]);
            const buf2 = Buffer.alloc(10);
            const buf3 = Buffer.alloc(3);

            strictEqual(Uint8Array.copy(buf1, buf2), 5);
            strictEqual(Uint8Array.copy(buf1, buf3), 3);

            deepStrictEqual(buf2, Buffer.from([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]));
            deepStrictEqual(buf3, Buffer.from([1, 2, 3]));
        }
    });

    it("Uint8Array.concat", () => {
        const arr1 = new Uint8Array([1, 2, 3]);
        const arr2 = new Uint8Array([4, 5, 6]);
        const arr3 = new Uint8Array([7, 8, 9]);
        const arr = Uint8Array.concat(arr1, arr2, arr3);

        deepStrictEqual(arr, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));

        if (typeof Buffer === "function") {
            const buf1 = Buffer.from([1, 2, 3]);
            const buf2 = Buffer.from([4, 5, 6]);
            const buf3 = Buffer.from([7, 8, 9]);
            const buf = Uint8Array.concat(buf1, buf2, buf3);

            deepStrictEqual(buf, Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]));
        }
    });

    it("Uint8Array.compare", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr3 = new Uint8Array([1, 2, 3, 4]);
        const arr4 = new Uint8Array([2, 3, 4, 5, 6]);

        strictEqual(Uint8Array.compare(arr1, arr1), 0);
        strictEqual(Uint8Array.compare(arr1, arr2), 0);
        strictEqual(Uint8Array.compare(arr1, arr3), 1);
        strictEqual(Uint8Array.compare(arr1, arr4), -1);

        if (typeof Buffer === "function") {
            strictEqual(Uint8Array.compare(arr1, arr2), Buffer.compare(arr1, arr2));
            strictEqual(Uint8Array.compare(arr1, arr3), Buffer.compare(arr1, arr3));
            strictEqual(Uint8Array.compare(arr1, arr4), Buffer.compare(arr1, arr4));
        }
    });

    it("Uint8Array.prototype.equals", () => {
        const arr = new Uint8Array([1, 2, 3, 4, 5]);
        ok(arr.equals(new Uint8Array([1, 2, 3, 4, 5])));
        ok(!arr.equals(new Uint8Array([1, 2, 3, 4])));
        ok(!arr.equals(new Uint8Array([2, 3, 4, 5, 6])));

        if (typeof Buffer === "function") {
            const buf = Buffer.from([1, 2, 3, 4, 5]);
            ok(buf.equals(Buffer.from([1, 2, 3, 4, 5])));
            ok(!buf.equals(Buffer.from([1, 2, 3, 4])));
            ok(!buf.equals(Buffer.from([2, 3, 4, 5, 6])));
            ok(arr.equals(buf));
        }

        const largeArray1 = new Uint8Array(new Array(1024).fill(0).map((_, i) => i));
        const largeArray2 = new Uint8Array(new Array(1024).fill(0).map((_, i) => i));
        ok(largeArray1.equals(largeArray2));
    });

    it("Uint8Array.prototype.split", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        deepStrictEqual(arr.split(2), [
            new Uint8Array([0, 1]),
            new Uint8Array([3, 4, 5, 4, 3]),
            new Uint8Array([1]),
        ]);
        deepStrictEqual(arr.split(5), [new Uint8Array([0, 1, 2, 3, 4]), new Uint8Array([4, 3, 2, 1])]);
        deepStrictEqual(arr.split(1), [
            new Uint8Array([0]),
            new Uint8Array([2, 3, 4, 5, 4, 3, 2]),
            new Uint8Array([]),
        ]);

        if (typeof Buffer === "function") {
            const buf = Buffer.from([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
            deepStrictEqual(buf.split(2), [
                Buffer.from([0, 1]),
                Buffer.from([3, 4, 5, 4, 3]),
                Buffer.from([1]),
            ]);
            deepStrictEqual(buf.split(5), [Buffer.from([0, 1, 2, 3, 4]), Buffer.from([4, 3, 2, 1])]);
            deepStrictEqual(buf.split(1), [
                Buffer.from([0]),
                Buffer.from([2, 3, 4, 5, 4, 3, 2]),
                Buffer.from([]),
            ]);
        }
    });

    it("Uint8Array.prototype.chunk", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        deepStrictEqual(arr.chunk(2), [
            new Uint8Array([0, 1]),
            new Uint8Array([2, 3]),
            new Uint8Array([4, 5]),
            new Uint8Array([6, 7]),
            new Uint8Array([8, 9]),
        ]);
        deepStrictEqual(arr.chunk(3), [
            new Uint8Array([0, 1, 2]),
            new Uint8Array([3, 4, 5]),
            new Uint8Array([6, 7, 8]),
            new Uint8Array([9]),
        ]);

        if (typeof Buffer === "function") {
            const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            deepStrictEqual(buf.chunk(2), [
                Buffer.from([0, 1]),
                Buffer.from([2, 3]),
                Buffer.from([4, 5]),
                Buffer.from([6, 7]),
                Buffer.from([8, 9]),
            ]);
            deepStrictEqual(buf.chunk(3), [
                Buffer.from([0, 1, 2]),
                Buffer.from([3, 4, 5]),
                Buffer.from([6, 7, 8]),
                Buffer.from([9]),
            ]);
        }
    });
});
