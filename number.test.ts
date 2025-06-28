import "./augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { try_ } from "./result.ts";

describe("Number", () => {
    it("isFloat", () => {
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

    it("isNumeric", () => {
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

    it("isBetween", () => {
        {
            ok(Number.isBetween(1, [1, 2]));
            ok(Number.isBetween(2, [1, 2]));
            ok(Number.isBetween(2, [1, 3]));
            ok(!Number.isBetween(0, [1, 2]));
            ok(!Number.isBetween(3, [1, 2]));
        }

        {
            ok((1).isBetween(1, 2));
            ok((2).isBetween(1, 2));
            ok((1).isBetween(1, 3));
            ok(!(0).isBetween(1, 2));
            ok(!(3).isBetween(1, 2));
        }
    });

    it("clamp", () => {
        strictEqual((5).clamp(1, 10), 5);
        strictEqual((0).clamp(1, 10), 1);
        strictEqual((11).clamp(1, 10), 10);
        strictEqual((5).clamp(5, 5), 5);

        const result = try_(() => (5).clamp(6, 4));
        strictEqual(result.ok, false);
        strictEqual(result.error instanceof RangeError, true);
    });

    it("random", () => {
        strictEqual(Number.random(0, 0), 0);

        const num = Number.random(0, 10);
        ok(num >= 0 && num <= 10);
    });

    it("range", () => {
        deepStrictEqual([...Number.range(0, 9)], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("serial", () => {
        const ids: number[] = [];

        for (const id of Number.serial()) {
            ids.push(id);

            if (ids.length === 9) {
                break;
            }
        }

        deepStrictEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
});
