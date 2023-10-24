import "../augment.ts";
import { strictEqual, deepStrictEqual, ok } from "node:assert";

describe("Exception", () => {
    it("new Exception", () => {
        const e1 = new Exception("something went wrong");
        ok(e1 instanceof Error);
        strictEqual(e1.name, "Exception");
        strictEqual(e1.cause, undefined);
        strictEqual(e1.code, 0);
        strictEqual(e1.message, "something went wrong");

        const e2 = new Exception("something went wrong", 500);
        strictEqual(e2.name, "Exception");
        strictEqual(e2.cause, undefined);
        strictEqual(e2.code, 500);

        const err = new Error("source error");
        const e3 = new Exception("something went wrong", {
            cause: err,
        });
        strictEqual(e3.name, "Exception");
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
        strictEqual(e4.name, "Exception");
        strictEqual(e4.cause, err);
        strictEqual(e4.code, 500);

        const e5 = new Exception("something went wrong", "UnknownError");
        deepStrictEqual(Object.getOwnPropertyDescriptor(e5, "name"), {
            configurable: true,
            enumerable: false,
            writable: true,
            value: "UnknownError",
        } as PropertyDescriptor);
        strictEqual(e5.cause, undefined);
        strictEqual(e5.code, 0);

        const e6 = new Exception("something went wrong", {
            name: "UnknownError",
            code: 500,
        });
        deepStrictEqual(Object.getOwnPropertyDescriptor(e6, "name"), {
            configurable: true,
            enumerable: false,
            writable: true,
            value: "UnknownError",
        } as PropertyDescriptor);
        strictEqual(e6.cause, undefined);
        strictEqual(e6.code, 500);
    });
});
