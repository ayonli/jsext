import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { sleep } from "@jsext/async";
import { as } from "@jsext/object";
import { try_ } from "@jsext/result";
import debounce from "./index.ts";

describe("debounce", () => {
    it("success", async () => {
        let count = 0;
        const fn = debounce(<T>(obj: T) => {
            count++;
            return obj;
        }, 5);
        const [res1, res2] = await Promise.all([
            fn({ foo: "hello", bar: "world" }),
            fn({ foo: "hi" }),
        ]);

        deepStrictEqual(res1, { foo: "hi" });
        ok(res1 === res2);
        strictEqual(count, 1);

        await sleep(6);
        const res3 = await fn({ bar: "world" });
        deepStrictEqual(res3, { bar: "world" });
        strictEqual(count, 2);
    });

    it("error", async () => {
        let count = 0;
        const fn = debounce(<T>(obj: T) => {
            count++;

            if ("foo" in (obj as any) && (obj as any)["foo"] === "hi") {
                throw new Error("something went wrong");
            } else {
                return obj;
            }
        }, 5);
        const [res1, res2] = await Promise.all([
            try_(fn({ foo: "hello", bar: "world" })),
            try_(fn({ foo: "hi" })),
        ]);
        deepStrictEqual(res1.error, new Error("something went wrong"));
        strictEqual(res1.error, res2.error);
        strictEqual(count, 1);

        await sleep(6);
        const res3 = await fn({ bar: "world" });
        deepStrictEqual(res3, { bar: "world" });
        strictEqual(count, 2);
    });

    it("async function", async () => {
        let count = 0;
        const fn = debounce(async <T>(obj: T) => {
            count++;
            return await Promise.resolve(obj);
        }, 5);
        const [res1, res2] = await Promise.all([
            fn({ foo: "hello", bar: "world" }),
            fn({ foo: "hi" }),
        ]);

        deepStrictEqual(res1, { foo: "hi" });
        ok(res1 === res2);
        strictEqual(count, 1);

        await sleep(6);
        const res3 = await fn({ bar: "world" });
        deepStrictEqual(res3, { bar: "world" });
        strictEqual(count, 2);
    });

    it("with reducer", async () => {
        let count = 0;
        const fn = debounce(async <T>(obj: T) => {
            count++;
            return await Promise.resolve(obj);
        }, 5, (prev, data) => {
            return { ...prev, ...data };
        });
        const [res1, res2] = await Promise.all([
            fn({ foo: "hello", bar: "world" }),
            fn({ foo: "hi" }),
        ]);

        deepStrictEqual(res1, { foo: "hi", bar: "world" });
        ok(res1 === res2);
        strictEqual(count, 1);

        await sleep(6);
        const res3 = await fn({ bar: "world" });
        deepStrictEqual(res3, { bar: "world" });
        strictEqual(count, 2);
    });

    it("with key", async () => {
        let count = 0;
        const [res1, res2] = await Promise.all([
            debounce(async <T>(obj: T) => {
                count++;
                return await Promise.resolve(obj);
            }, { delay: 5, for: "foo" }, (prev, data) => {
                return { ...prev, ...data };
            })({ foo: "hello", bar: "world" }),
            debounce(async <T>(obj: T) => {
                count += 2;
                return await Promise.resolve(obj);
            }, { delay: 5, for: "foo" }, (prev, data) => {
                return { ...prev, ...data };
            })({ foo: "hi" }),
        ]);

        deepStrictEqual(res1, { foo: "hi", bar: "world" });
        ok(res1 === res2);
        strictEqual(count, 2);

        await sleep(6);
        const res3 = await debounce(async <T>(obj: T) => {
            count += 3;
            return await Promise.resolve(obj);
        }, { delay: 5, for: "foo" }, (prev, data) => {
            return { ...prev, ...data };
        })({ bar: "world" });
        deepStrictEqual(res3, { bar: "world" });
        strictEqual(count, 5);
    });

    it("abort", async () => {
        const controller = new AbortController();
        const { signal } = controller;
        let count = 0;
        const fn = debounce(async <T>(obj: T) => {
            count++;
            return await Promise.resolve(obj);
        }, { delay: 5, signal });

        const task1 = fn({ foo: "hello", bar: "world" });
        const task2 = fn({ foo: "hi" });
        controller.abort();

        const [res1, res2] = await Promise.allSettled([task1, task2]);

        strictEqual(res1.status, "rejected");
        strictEqual(res2.status, "rejected");
        strictEqual(as(res1.reason, Error)?.name, "AbortError");
        ok(res1.reason === res2.reason);
    });
});
