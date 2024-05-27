import { deepStrictEqual, strictEqual } from "node:assert";
import bytes, {
    ByteArray,
    compare,
    concat,
    copy,
    equals,
    includesSlice,
    startsWith,
    endsWith,
    split,
    chunk,
    text,
} from "./bytes.ts";

describe("bytes", () => {
    describe("ByteArray", () => {
        it("toString", () => {
            strictEqual(new ByteArray([72, 101, 108, 108, 111]).toString(), "Hello");
            strictEqual(String(new ByteArray([72, 101, 108, 108, 111])), "Hello");
            strictEqual("" + new ByteArray([72, 101, 108, 108, 111]), "Hello");
        });

        it("toJSON", () => {
            deepStrictEqual(new ByteArray([72, 101, 108, 108, 111]).toJSON(), {
                type: "ByteArray",
                data: [72, 101, 108, 108, 111],
            });
            strictEqual(
                JSON.stringify(new ByteArray([72, 101, 108, 108, 111])),
                '{"type":"ByteArray","data":[72,101,108,108,111]}'
            );
        });
    });

    describe("bytes", () => {
        it("number", () => {
            deepStrictEqual(bytes(5).buffer, new Uint8Array(5).buffer);
            strictEqual(bytes(5).length, 5);
        });

        it("string", () => {
            deepStrictEqual(
                new Uint8Array(bytes("Hello, World!")),
                new TextEncoder().encode("Hello, World!")
            );
        });

        it("ArrayLike<number>", () => {
            deepStrictEqual(new Uint8Array(bytes([1, 2, 3, 4, 5])), new Uint8Array([1, 2, 3, 4, 5]));
        });

        it("Uint8Array", () => {
            deepStrictEqual(
                bytes(new Uint8Array([1, 2, 3, 4, 5])).buffer,
                new Uint8Array([1, 2, 3, 4, 5]).buffer
            );
        });

        it("ArrayBuffer", () => {
            deepStrictEqual(bytes(new ArrayBuffer(5)).buffer, new Uint8Array(5).buffer);
            deepStrictEqual(
                bytes(new Uint8Array([1, 2, 3, 4, 5]).buffer).buffer,
                new Uint8Array([1, 2, 3, 4, 5]).buffer
            );
        });

        it("DataView", () => {
            const arr = new Uint8Array([1, 2, 3, 4, 5]);
            const dataView = new DataView(arr.buffer);
            deepStrictEqual(bytes(dataView).buffer, arr.buffer);
        });

        it("Buffer", function () {
            if (typeof Buffer !== "function") {
                this.skip();
            }

            const buf = Buffer.from("Hello, World!");
            deepStrictEqual(
                bytes(buf).buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
                new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]).buffer
            );
        });
    });

    it("text", () => {
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111])), "Hello");
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111]), "utf8"), "Hello");
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111]), "base64"), "SGVsbG8=");
        strictEqual(text(new Uint8Array([72, 101, 108, 108, 111]), "hex"), "48656c6c6f");

        strictEqual(text(bytes("Hello")), "Hello");
        strictEqual(text(bytes("Hello")), "Hello");
        strictEqual(text(bytes("Hello"), "utf8"), "Hello");
        strictEqual(text(bytes("Hello"), "base64"), "SGVsbG8=");
        strictEqual(text(bytes("Hello"), "hex"), "48656c6c6f");

        if (typeof Buffer === "function") {
            strictEqual(text(Buffer.from("Hello")), "Hello");
            strictEqual(text(Buffer.from("Hello")), "Hello");
            strictEqual(text(Buffer.from("Hello"), "utf8"), "Hello");
            strictEqual(text(Buffer.from("Hello"), "base64"), "SGVsbG8=");
            strictEqual(text(Buffer.from("Hello"), "hex"), "48656c6c6f");
        }
    });

    it("copy", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array(10);
        const arr3 = new Uint8Array(3);

        strictEqual(copy(arr1, arr2), 5);
        strictEqual(copy(arr1, arr3), 3);

        deepStrictEqual(arr2, new Uint8Array([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]));
        deepStrictEqual(arr3, new Uint8Array([1, 2, 3]));

        const bytes1 = bytes([1, 2, 3, 4, 5]);
        const bytes2 = bytes(10);
        const bytes3 = bytes(3);

        strictEqual(copy(bytes1, bytes2), 5);
        strictEqual(copy(bytes1, bytes3), 3);

        deepStrictEqual(bytes2, new ByteArray([1, 2, 3, 4, 5, 0, 0, 0, 0, 0]));
        deepStrictEqual(bytes3, new ByteArray([1, 2, 3]));

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

        const bytes1 = bytes([1, 2, 3]);
        const bytes2 = bytes([4, 5, 6]);
        const bytes3 = bytes([7, 8, 9]);
        const _bytes = concat(bytes1, bytes2, bytes3);

        deepStrictEqual(_bytes, new ByteArray([1, 2, 3, 4, 5, 6, 7, 8, 9]));

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

        const byte1 = bytes([1, 2, 3, 4, 5]);
        const byte2 = bytes([1, 2, 3, 4, 5]);
        const byte3 = bytes([1, 2, 3, 4]);
        const byte4 = bytes([2, 3, 4, 5, 6]);

        strictEqual(compare(byte1, byte1), 0);
        strictEqual(compare(byte1, byte2), 0);
        strictEqual(compare(byte1, byte3), 1);
        strictEqual(compare(byte1, byte4), -1);

        if (typeof Buffer === "function") {
            strictEqual(compare(arr1, arr2), Buffer.compare(arr1, arr2));
            strictEqual(compare(arr1, arr3), Buffer.compare(arr1, arr3));
            strictEqual(compare(arr1, arr4), Buffer.compare(arr1, arr4));
        }
    });

    it("equals", () => {
        const arr1 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr2 = new Uint8Array([1, 2, 3, 4, 5]);
        const arr3 = new Uint8Array([1, 2, 3, 4]);
        const arr4 = new Uint8Array([2, 3, 4, 5, 6]);

        strictEqual(equals(arr1, arr1), true);
        strictEqual(equals(arr1, arr2), true);
        strictEqual(equals(arr1, arr3), false);
        strictEqual(equals(arr1, arr4), false);

        const byte1 = bytes([1, 2, 3, 4, 5]);
        const byte2 = bytes([1, 2, 3, 4, 5]);
        const byte3 = bytes([1, 2, 3, 4]);
        const byte4 = bytes([2, 3, 4, 5, 6]);

        strictEqual(equals(byte1, byte1), true);
        strictEqual(equals(byte1, byte2), true);
        strictEqual(equals(byte1, byte3), false);
        strictEqual(equals(byte1, byte4), false);

        if (typeof Buffer === "function") {
            const buf1 = Buffer.from([1, 2, 3]);
            const buf2 = Buffer.from([4, 5, 6]);
            const buf3 = Buffer.from([7, 8, 9]);
            const buf4 = Buffer.from([1, 2, 3]);

            strictEqual(equals(buf1, buf1), true);
            strictEqual(equals(buf1, buf2), false);
            strictEqual(equals(buf1, buf3), false);
            strictEqual(equals(buf1, buf4), true);
        }
    });

    it("includesSlice", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        strictEqual(includesSlice(arr, new Uint8Array([2, 3, 4])), true);
        strictEqual(includesSlice(arr, new Uint8Array([2, 3, 4, 5])), true);
        strictEqual(includesSlice(arr, new Uint8Array([2, 3, 4, 5, 6])), false);

        const _bytes = bytes([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        strictEqual(includesSlice(_bytes, new ByteArray([2, 3, 4])), true);
        strictEqual(includesSlice(_bytes, new ByteArray([2, 3, 4, 5])), true);
        strictEqual(includesSlice(_bytes, new ByteArray([2, 3, 4, 5, 6])), false);

        if (typeof Buffer === "function") {
            const buf = Buffer.from([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
            strictEqual(includesSlice(buf, Buffer.from([2, 3, 4])), true);
            strictEqual(includesSlice(buf, Buffer.from([2, 3, 4, 5])), true);
            strictEqual(includesSlice(buf, Buffer.from([2, 3, 4, 5, 6])), false);
        }
    });

    it("startsWith", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        strictEqual(startsWith(arr, new Uint8Array([0, 1, 2])), true);
        strictEqual(startsWith(arr, new Uint8Array([0, 1, 2, 3])), true);
        strictEqual(startsWith(arr, new Uint8Array([0, 1, 2, 3, 4])), true);
        strictEqual(startsWith(arr, new Uint8Array([0, 1, 2, 3, 4, 5])), true);
        strictEqual(startsWith(arr, new Uint8Array([0, 1, 2, 3, 4, 5, 6])), false);

        const _bytes = bytes([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        strictEqual(startsWith(_bytes, new ByteArray([0, 1, 2])), true);
        strictEqual(startsWith(_bytes, new ByteArray([0, 1, 2, 3])), true);
        strictEqual(startsWith(_bytes, new ByteArray([0, 1, 2, 3, 4])), true);
        strictEqual(startsWith(_bytes, new ByteArray([0, 1, 2, 3, 4, 5])), true);
        strictEqual(startsWith(_bytes, new ByteArray([0, 1, 2, 3, 4, 5, 6])), false);

        if (typeof Buffer === "function") {
            const buf = Buffer.from([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
            strictEqual(startsWith(buf, Buffer.from([0, 1, 2])), true);
            strictEqual(startsWith(buf, Buffer.from([0, 1, 2, 3])), true);
            strictEqual(startsWith(buf, Buffer.from([0, 1, 2, 3, 4])), true);
            strictEqual(startsWith(buf, Buffer.from([0, 1, 2, 3, 4, 5])), true);
            strictEqual(startsWith(buf, Buffer.from([0, 1, 2, 3, 4, 5, 6])), false);
        }
    });

    it("endsWith", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        strictEqual(endsWith(arr, new Uint8Array([2, 1])), true);
        strictEqual(endsWith(arr, new Uint8Array([3, 2, 1])), true);
        strictEqual(endsWith(arr, new Uint8Array([4, 3, 2, 1])), true);
        strictEqual(endsWith(arr, new Uint8Array([5, 4, 3, 2, 1])), true);
        strictEqual(endsWith(arr, new Uint8Array([6, 5, 4, 3, 2, 1])), false);

        const _bytes = bytes([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        strictEqual(endsWith(_bytes, new ByteArray([2, 1])), true);
        strictEqual(endsWith(_bytes, new ByteArray([3, 2, 1])), true);
        strictEqual(endsWith(_bytes, new ByteArray([4, 3, 2, 1])), true);
        strictEqual(endsWith(_bytes, new ByteArray([5, 4, 3, 2, 1])), true);
        strictEqual(endsWith(_bytes, new ByteArray([6, 5, 4, 3, 2, 1])), false);

        if (typeof Buffer === "function") {
            const buf = Buffer.from([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
            strictEqual(endsWith(buf, Buffer.from([2, 1])), true);
            strictEqual(endsWith(buf, Buffer.from([3, 2, 1])), true);
            strictEqual(endsWith(buf, Buffer.from([4, 3, 2, 1])), true);
            strictEqual(endsWith(buf, Buffer.from([5, 4, 3, 2, 1])), true);
            strictEqual(endsWith(buf, Buffer.from([6, 5, 4, 3, 2, 1])), false);
        }
    });

    it("split", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        deepStrictEqual(split(arr, 2), [
            new Uint8Array([0, 1]),
            new Uint8Array([3, 4, 5, 4, 3]),
            new Uint8Array([1]),
        ]);
        deepStrictEqual(split(arr, 5), [
            new Uint8Array([0, 1, 2, 3, 4]),
            new Uint8Array([4, 3, 2, 1])
        ]);
        deepStrictEqual(split(arr, 1), [
            new Uint8Array([0]),
            new Uint8Array([2, 3, 4, 5, 4, 3, 2]),
            new Uint8Array([]),
        ]);

        const _bytes = bytes([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        deepStrictEqual(split(_bytes, 2), [
            new ByteArray([0, 1]),
            new ByteArray([3, 4, 5, 4, 3]),
            new ByteArray([1]),
        ]);
        deepStrictEqual(split(_bytes, 5), [
            new ByteArray([0, 1, 2, 3, 4]),
            new ByteArray([4, 3, 2, 1])
        ]);
        deepStrictEqual(split(_bytes, 1), [
            new ByteArray([0]),
            new ByteArray([2, 3, 4, 5, 4, 3, 2]),
            new ByteArray([]),
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

    it("chunk", () => {
        const arr = new Uint8Array([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        deepStrictEqual(chunk(arr, 2), [
            new Uint8Array([0, 1]),
            new Uint8Array([2, 3]),
            new Uint8Array([4, 5]),
            new Uint8Array([4, 3]),
            new Uint8Array([2, 1]),
        ]);
        deepStrictEqual(chunk(arr, 5), [
            new Uint8Array([0, 1, 2, 3, 4]),
            new Uint8Array([5, 4, 3, 2, 1]),
        ]);
        deepStrictEqual(chunk(arr, 1), [
            new Uint8Array([0]),
            new Uint8Array([1]),
            new Uint8Array([2]),
            new Uint8Array([3]),
            new Uint8Array([4]),
            new Uint8Array([5]),
            new Uint8Array([4]),
            new Uint8Array([3]),
            new Uint8Array([2]),
            new Uint8Array([1]),
        ]);

        const _bytes = bytes([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
        deepStrictEqual(chunk(_bytes, 2), [
            new ByteArray([0, 1]),
            new ByteArray([2, 3]),
            new ByteArray([4, 5]),
            new ByteArray([4, 3]),
            new ByteArray([2, 1]),
        ]);
        deepStrictEqual(chunk(_bytes, 5), [
            new ByteArray([0, 1, 2, 3, 4]),
            new ByteArray([5, 4, 3, 2, 1]),
        ]);
        deepStrictEqual(chunk(_bytes, 1), [
            new ByteArray([0]),
            new ByteArray([1]),
            new ByteArray([2]),
            new ByteArray([3]),
            new ByteArray([4]),
            new ByteArray([5]),
            new ByteArray([4]),
            new ByteArray([3]),
            new ByteArray([2]),
            new ByteArray([1]),
        ]);

        if (typeof Buffer === "function") {
            const buf = Buffer.from([0, 1, 2, 3, 4, 5, 4, 3, 2, 1]);
            deepStrictEqual(chunk(buf, 2), [
                Buffer.from([0, 1]),
                Buffer.from([2, 3]),
                Buffer.from([4, 5]),
                Buffer.from([4, 3]),
                Buffer.from([2, 1]),
            ]);
            deepStrictEqual(chunk(buf, 5), [
                Buffer.from([0, 1, 2, 3, 4]),
                Buffer.from([5, 4, 3, 2, 1]),
            ]);
            deepStrictEqual(chunk(buf, 1), [
                Buffer.from([0]),
                Buffer.from([1]),
                Buffer.from([2]),
                Buffer.from([3]),
                Buffer.from([4]),
                Buffer.from([5]),
                Buffer.from([4]),
                Buffer.from([3]),
                Buffer.from([2]),
                Buffer.from([1]),
            ]);
        }
    });
});
