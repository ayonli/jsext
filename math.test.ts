import "./math";
import { describe, test } from "mocha";
import { strictEqual } from "assert";

describe("Math", () => {
    test("Math.sum", () => {
        strictEqual(Math.sum(1), 1);
        strictEqual(Math.sum(1, 2), 3);
        strictEqual(Math.sum(1, 2, 0.5), 3.5);
    });

    test("Math.avg", () => {
        strictEqual(Math.avg(1), 1);
        strictEqual(Math.avg(1, 2), 1.5);
        strictEqual(Math.avg(1, 2, 3), 2);
    });

    test("Math.product", () => {
        strictEqual(Math.product(1), 1);
        strictEqual(Math.product(1, 2), 2);
        strictEqual(Math.product(1, 2, 0.5), 1);
    });
});
