import "../augment";
import { describe, test } from "mocha";
import { deepStrictEqual, ok, strictEqual } from "assert";

describe("Number", () => {
    test("Number.isFloat", () => {
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

    test("Number.random", () => {
        strictEqual(Number.random(0, 0), 0);

        const num = Number.random(0, 10);
        ok(num >= 0 && num <= 10);
    });

    test("Number.sequence", () => {
        deepStrictEqual([...Number.sequence(0, 9)], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        deepStrictEqual([...Number.sequence(0, 3, 0.5)], [0, 0.5, 1, 1.5, 2, 2.5, 3]);

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
