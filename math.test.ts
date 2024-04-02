import "./augment.ts";
import { strictEqual } from "node:assert";

describe("Math", () => {
    it("Math.sum", () => {
        strictEqual(Math.sum(1), 1);
        strictEqual(Math.sum(1, 2), 3);
        strictEqual(Math.sum(1, 2, 0.5), 3.5);
    });

    it("Math.avg", () => {
        strictEqual(Math.avg(1), 1);
        strictEqual(Math.avg(1, 2), 1.5);
        strictEqual(Math.avg(1, 2, 3), 2);
    });

    it("Math.product", () => {
        strictEqual(Math.product(1), 1);
        strictEqual(Math.product(1, 2), 2);
        strictEqual(Math.product(1, 2, 0.5), 1);
    });
});
