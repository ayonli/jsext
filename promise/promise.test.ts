import "../augment";
import jsext from "../index";
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
        const [err, res2] = await jsext.try(Promise.timeout(job, 50));
        strictEqual(res2, undefined);
        deepStrictEqual(err, new Error("operation timeout after 50ms"));
    });

    test("Promise.after", async () => {
        let startTime = Date.now();
        const res1 = await Promise.after(Promise.resolve(1), 50);
        const duration = Date.now() - startTime;

        strictEqual(res1, 1);
        ok(duration >= 49); // setTimeout is inaccurate, it could tick faster then expected.

        startTime = Date.now();
        const job = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 100);
        });
        const res2 = await Promise.after(job, 50);
        const duration2 = Date.now() - startTime;

        strictEqual(res2, 1);
        ok(duration2 >= 100);
    });

    test("Promise.sleep", async () => {
        let startTime = Date.now();
        await Promise.sleep(50);
        ok(Date.now() - startTime >= 50);
    });
});
