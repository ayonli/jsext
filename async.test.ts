import "./augment.ts";
import jsext from "./index.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";

describe("async", () => {
    it("timeout", async () => {
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

    it("after", async () => {
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
        ok(duration2 >= 99);
    });

    it("sleep", async () => {
        const startTime = Date.now();
        await Promise.sleep(50);
        ok(Date.now() - startTime >= 49);
    });

    describe("until", () => {
        it("return true", async () => {
            let result = 0;
            const ok = await Promise.until(() => (++result) === 10);
            strictEqual(ok, true);
            strictEqual(result, 10);
        });

        it("return truthy", async () => {
            let value: string | undefined = undefined;
            const timer = setTimeout(() => {
                value = "ok";
            }, 50);

            const result = await Promise.until(() => value);
            clearTimeout(timer);
            strictEqual(result, "ok");
        });

        it("handle exception", async () => {
            let value: string | undefined = undefined;
            const timer = setTimeout(() => {
                value = "ok";
            }, 50);

            const result = await Promise.until(() => {
                if (value !== "ok") {
                    throw new Error("error");
                }
                return value;
            });
            clearTimeout(timer);
            strictEqual(result, "ok");
        });
    });
});