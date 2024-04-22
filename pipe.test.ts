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

        it("Array.prototype.pipe", () => {
            const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
            strictEqual([1, 2, 3].pipe(sum).value, 6);

            const times = (arr: number[], times: number) => arr.map(n => n * times);
            deepStrictEqual([1, 2, 3].pipe(times, 2).value, [2, 4, 6]);
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

        it("Error.prototype.pipe", () => {
            const toString = (err: Error) => err.message;
            strictEqual(new Error("test").pipe(toString).value, "test");
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
    });
});
