import "./promise";
import "./function";
import { describe, test } from "mocha";
import { deepStrictEqual, ok, strictEqual } from "assert";

describe("Promise", () => {
    test("Promise.timeout", async () => {
        const res1 = await Promise.timeout(Promise.resolve(1), 50);

        strictEqual(res1, 1);

        const job = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 100);
        });
        const [err, res2] = await Function.try(Promise.timeout(job, 50));
        strictEqual(res2, undefined);
        deepStrictEqual(err, new Error("operation timeout after 50ms"));
    });

    test("Promise.after", async () => {
        let startTime = Date.now();
        const res1 = await Promise.after(Promise.resolve(1), 50);

        strictEqual(res1, 1);
        ok(Date.now() - startTime >= 50);

        startTime = Date.now();
        const job = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 100);
        });
        const res2 = await Promise.after(job, 50);
        strictEqual(res2, 1);
        ok(Date.now() - startTime >= 100);
    });

    test("Promise.sleep", async () => {
        let startTime = Date.now();
        await Promise.sleep(50);
        ok(Date.now() - startTime >= 50);
    });
});
