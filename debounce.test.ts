import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { sleep } from "./async.ts";
import jsext from "./index.ts";

describe("jsext.debounce", () => {
    it("success", async () => {
        let count = 0;
        const fn = jsext.debounce(<T>(obj: T) => {
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
        const fn = jsext.debounce(<T>(obj: T) => {
            count++;

            if ("foo" in (obj as any) && (obj as any)["foo"] === "hi") {
                throw new Error("something went wrong");
            } else {
                return obj;
            }
        }, 5);
        const [[err1], [err2]] = await Promise.all([
            jsext.try(fn({ foo: "hello", bar: "world" })),
            jsext.try(fn({ foo: "hi" })),
        ]);
        deepStrictEqual(err1, new Error("something went wrong"));
        ok(err1 === err2);
        strictEqual(count, 1);

        await sleep(6);
        const res3 = await fn({ bar: "world" });
        deepStrictEqual(res3, { bar: "world" });
        strictEqual(count, 2);
    });

    it("async function", async () => {
        let count = 0;
        const fn = jsext.debounce(async <T>(obj: T) => {
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
        const fn = jsext.debounce(async <T>(obj: T) => {
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
            jsext.debounce(async <T>(obj: T) => {
                count++;
                return await Promise.resolve(obj);
            }, { delay: 5, for: "foo" }, (prev, data) => {
                return { ...prev, ...data };
            })({ foo: "hello", bar: "world" }),
            jsext.debounce(async <T>(obj: T) => {
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
        const res3 = await jsext.debounce(async <T>(obj: T) => {
            count += 3;
            return await Promise.resolve(obj);
        }, { delay: 5, for: "foo" }, (prev, data) => {
            return { ...prev, ...data };
        })({ bar: "world" });
        deepStrictEqual(res3, { bar: "world" });
        strictEqual(count, 5);
    });
});
