import { deepStrictEqual, strictEqual } from "node:assert";
import { sleep } from "./promise/index.ts";
import jsext, { AsyncMutex } from "./index.ts";

describe("jsext.lock", () => {
    it("lock and release", async () => {
        const key = 1;
        const results: number[] = [];

        await Promise.all([
            jsext.func(async (defer) => {
                const lock = await jsext.lock(key);
                defer(() => lock.release());

                await sleep(50);
                results.push(1);
            })(),
            jsext.func(async (defer) => {
                const lock = await jsext.lock(key);
                defer(() => lock.release());

                await sleep(40);
                results.push(2);
            })(),
        ]);

        deepStrictEqual(results, [1, 2]);
    });

    it("AsyncMutex", async () => {
        const mutex = new AsyncMutex(1);
        let value = 1;

        await Promise.all([
            jsext.func(async (defer) => {
                const lock = await mutex.lock();
                defer(() => lock.release());

                await sleep(50);
                lock.value = 2;
            })(),
            jsext.func(async (defer) => {
                const lock = await mutex.lock();
                defer(() => lock.release());

                await sleep(40);
                lock.value = 3;
            })(),
            jsext.func(async (defer) => {
                const lock = await mutex.lock();
                defer(() => lock.release());

                await sleep(30);
                value = lock.value;
            })(),
        ]);

        strictEqual(value, 3);
    });
});
