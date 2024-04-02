import "./augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";

describe("Number", () => {
    it("Number.isFloat", () => {
        ok(Number.isFloat(1.2));
        ok(Number.isFloat(Infinity));
        ok(Number.isFloat(-Infinity));
        ok(Number.isFloat(Number.MIN_VALUE));
        ok(!Number.isFloat(Number.MAX_VALUE));
        ok(!Number.isFloat(1));
        ok(!Number.isFloat("1.2"));
        ok(!Number.isFloat("abc"));
        ok(!Number.isFloat(NaN));
    });

    it("Number.isNumeric", () => {
        ok(Number.isNumeric(123));
        ok(Number.isNumeric(123, true));
        ok(Number.isNumeric(Infinity));
        ok(Number.isNumeric(Infinity, true));
        ok(Number.isNumeric(-Infinity));
        ok(Number.isNumeric(-Infinity, true));
        ok(Number.isNumeric(Number.MIN_VALUE));
        ok(Number.isNumeric(Number.MAX_VALUE));
        ok(Number.isNumeric(BigInt(Number.MAX_VALUE)));
        ok(!Number.isNumeric(BigInt(Number.MAX_VALUE), true));
        ok(Number.isNumeric("123"));
        ok(!Number.isNumeric("123", true));
        ok(Number.isNumeric("1.23"));
        ok(!Number.isNumeric("1.23", true));
        ok(Number.isNumeric("0b1010"));
        ok(Number.isNumeric("0b1010"));
        ok(Number.isNumeric("0o123"));
        ok(Number.isNumeric("0x123"));
        ok(!Number.isNumeric("12n"));
        ok(!Number.isNumeric("12a"));
        ok(!Number.isNumeric("abc"));
        ok(!Number.isNumeric(""));
        ok(!Number.isNumeric(NaN));
    });

    it("Number.isBetween", () => {
        ok(Number.isBetween(1, [1, 2]));
        ok(Number.isBetween(2, [1, 2]));
        ok(Number.isBetween(2, [1, 3]));
        ok(!Number.isBetween(0, [1, 2]));
        ok(!Number.isBetween(3, [1, 2]));
    });

    it("Number.random", () => {
        strictEqual(Number.random(0, 0), 0);

        const num = Number.random(0, 10);
        ok(num >= 0 && num <= 10);
    });

    it("Number.range", () => {
        deepStrictEqual([...Number.range(0, 9)], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        deepStrictEqual([...Number.sequence(0, 9, 2)], [0, 2, 4, 6, 8]);
    });

    it("Number.serial", () => {
        const ids: number[] = [];

        for (const id of Number.serial()) {
            ids.push(id);

            if (ids.length === 9) {
                break;
            }
        }

        deepStrictEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("Number.sequence", () => {
        deepStrictEqual([...Number.sequence(0, 9)], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        deepStrictEqual([...Number.sequence(0, 9, 2)], [0, 2, 4, 6, 8]);

        const numbers: number[] = [];

        for (const num of Number.sequence(0, 2, 1, true)) {
            numbers.push(num);

            if (numbers.length === 9) {
                break;
            }
        }

        deepStrictEqual(numbers, [0, 1, 2, 0, 1, 2, 0, 1, 2]);
    });
});
