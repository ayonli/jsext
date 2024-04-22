import { deepStrictEqual, strictEqual } from "node:assert";
import jsext from "./index.ts";
import "./augment.ts";

describe("jsext.pipe", () => {
    it("pipe", () => {
        const { value } = jsext.pipe("10")
            .pipe(parseInt)
            .pipe(Math.pow, 2)
            .pipe(v => v.toFixed(2));

        strictEqual(value, "100.00");
    });

    describe("augment", () => {
        it("String.prototype.pipe", () => {
            strictEqual("10".pipe(parseInt).value, 10);
            strictEqual("a".pipe(parseInt, 16).value, 10);
        });

        it("Number.prototype.pipe", () => {
            const toString = (n: number, radix?: number | undefined) => n.toString(radix);
            strictEqual((10).pipe(toString).value, "10");
            strictEqual((10).pipe(toString, 16).value, "a");
        });

        it("BigInt.prototype.pipe", () => {
            const toString = (n: bigint, radix?: number | undefined) => n.toString(radix);
            strictEqual(BigInt(10).pipe(toString).value, "10");
            strictEqual(BigInt(10).pipe(toString, 16).value, "a");
        });

        it("Boolean.prototype.pipe", () => {
            strictEqual((true).pipe(String).value, "true");
            strictEqual((false).pipe(String).value, "false");
        });

        it("Symbol.prototype.pipe", () => {
            strictEqual(Symbol("foo").pipe(String).value, "Symbol(foo)");
        });

        it("Date.prototype.pipe", () => {
            const format = (date: Date) => {
                return `${date.getFullYear()}-`
                    + `${String(date.getMonth() + 1).padStart(2, "0")}-`
                    + `${String(date.getDate()).padStart(2, "0")}`;
            };
            strictEqual(new Date("2021-01-01T00:00:00Z").pipe(format).value, "2021-01-01");
        });

        it("RegExp.prototype.pipe", () => {
            const match = (re: RegExp, str: string) => str.match(re);
            deepStrictEqual([...(/a(b)c/.pipe(match, "abc").value ?? [])], ["abc", "b"]);
        });

        it("Error.prototype.pipe", () => {
            const toString = (err: Error) => err.message;
            strictEqual(new Error("test").pipe(toString).value, "test");
        });

        it("Map.prototype.pipe", () => {
            deepStrictEqual(new Map([["a", 1], ["b", 2], ["c", 3]]).pipe(Object.fromEntries).value, {
                a: 1,
                b: 2,
                c: 3,
            });
        });

        it("Set.prototype.pipe", () => {
            const sum = (set: Set<number>) => Array.from(set.values()).reduce((a, b) => a + b, 0);
            strictEqual(new Set([1, 2, 3]).pipe(sum).value, 6);

            const times = (set: Set<number>, times: number) => {
                return new Set(Array.from(set.values()).map(n => n * times));
            };
            deepStrictEqual(new Set([1, 2, 3]).pipe(times, 2).value, new Set([2, 4, 6]));
        });

        it("Array.prototype.pipe", () => {
            const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
            strictEqual([1, 2, 3].pipe(sum).value, 6);

            const times = (arr: number[], times: number) => arr.map(n => n * times);
            deepStrictEqual([1, 2, 3].pipe(times, 2).value, [2, 4, 6]);
        });

        it("TypedArray.prototype", () => {
            const sum = (arr: TypedArray) => arr.reduce((a, b) => a + b, 0);
            const times = (arr: TypedArray, times: number) => {
                return new (arr.constructor as Constructor<TypedArray>)(Array.from(arr).map(n => n * times));
            };

            strictEqual(new Int8Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Int8Array([1, 2, 3]).pipe(times, 2).value, new Int8Array([2, 4, 6]));

            strictEqual(new Uint8Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Uint8Array([1, 2, 3]).pipe(times, 2).value, new Uint8Array([2, 4, 6]));

            strictEqual(new Int16Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Int16Array([1, 2, 3]).pipe(times, 2).value, new Int16Array([2, 4, 6]));

            strictEqual(new Uint16Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Uint16Array([1, 2, 3]).pipe(times, 2).value, new Uint16Array([2, 4, 6]));

            strictEqual(new Int32Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Int32Array([1, 2, 3]).pipe(times, 2).value, new Int32Array([2, 4, 6]));

            strictEqual(new Uint32Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Uint32Array([1, 2, 3]).pipe(times, 2).value, new Uint32Array([2, 4, 6]));

            strictEqual(new Float32Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Float32Array([1, 2, 3]).pipe(times, 2).value, new Float32Array([2, 4, 6]));

            strictEqual(new Float64Array([1, 2, 3]).pipe(sum).value, 6);
            deepStrictEqual(new Float64Array([1, 2, 3]).pipe(times, 2).value, new Float64Array([2, 4, 6]));
        });
    });
});
