import "../augment";
import { describe, test } from "mocha";
import { deepStrictEqual, ok, strictEqual } from "assert";

describe("Uint8Array", () => {
    test("Uint8Array.compare", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr3 = new Uint8Array([1, 2, 3, 4]);
        const arr4 = new Uint8Array([2, 3, 4, 5, 6]);

        strictEqual(Uint8Array.compare(arr1, arr1), 0);
        strictEqual(Uint8Array.compare(arr1, arr2), 0);
        strictEqual(Uint8Array.compare(arr1, arr2), Buffer.compare(arr1, arr2));
        strictEqual(Uint8Array.compare(arr1, arr3), 1);
        strictEqual(Uint8Array.compare(arr1, arr3), Buffer.compare(arr1, arr3));
        strictEqual(Uint8Array.compare(arr1, arr4), -1);
        strictEqual(Uint8Array.compare(arr1, arr4), Buffer.compare(arr1, arr4));
    });

    test("Uint8Array.prototype.equals", () => {
        const arr = new Uint8Array([1, 2, 3, 4, 5]);
        ok(arr.equals(new Uint8Array([1, 2, 3, 4, 5])));
        ok(!arr.equals(new Uint8Array([1, 2, 3, 4])));
        ok(!arr.equals(new Uint8Array([2, 3, 4, 5, 6])));

        const buf = Buffer.from([1, 2, 3, 4, 5]);
        ok(buf.equals(Buffer.from([1, 2, 3, 4, 5])));
        ok(!buf.equals(Buffer.from([1, 2, 3, 4])));
        ok(!buf.equals(Buffer.from([2, 3, 4, 5, 6])));

        ok(arr.equals(buf));
    });

    test("Uint8Array.prototype.split", () => {
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
    });

    test("Uint8Array.prototype.chunk", () => {
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
    });
});
