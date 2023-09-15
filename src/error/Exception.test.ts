import "../augment";
import { test } from "mocha";
import { strictEqual, deepStrictEqual, ok } from "assert";

describe("Exception", () => {
    test("new Exception", () => {
        const e1 = new Exception("something went wrong");
        ok(e1 instanceof Error);
        strictEqual(e1.cause, undefined);
        strictEqual(e1.code, 0);
        strictEqual(e1.message, "something went wrong");

        const e2 = new Exception("something went wrong", 500);
        strictEqual(e2.cause, undefined);
        strictEqual(e2.code, 500);

        const err = new Error("source error");
        const e3 = new Exception("something went wrong", {
            cause: err,
        });
        strictEqual(e3.cause, err);
        strictEqual(e3.code, 0);
        deepStrictEqual(Object.getOwnPropertyDescriptor(e3, "cause"), {
            configurable: true,
            enumerable: false,
            writable: true,
            value: err,
        } as PropertyDescriptor);

        const e4 = new Exception("something went wrong", {
            cause: err,
            code: 500,
        });
        strictEqual(e4.cause, err);
        strictEqual(e4.code, 500);
    });
});
