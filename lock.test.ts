import { deepStrictEqual, strictEqual } from "node:assert";
import { sleep } from "./async.ts";
import { Mutex } from "./lock.ts";
import jsext from "./index.ts";
import { try_ } from "./result.ts";

describe("jsext.lock", () => {
    it("lock", async () => {
        const key = 1;
        const results: number[] = [];

        await Promise.all([
            jsext.func(async (defer) => {
                const lock = await jsext.lock(key);
                defer(() => lock.unlock());

                await sleep(50);
                results.push(1);
            })(),
            jsext.func(async (defer) => {
                const lock = await jsext.lock(key);
                defer(() => lock.unlock());

                await sleep(40);
                results.push(2);
            })(),
        ]);

        deepStrictEqual(results, [1, 2]);
    });

    it("Mutex", async () => {
        const mutex = new Mutex(1);
        let value = 1;

        await Promise.all([
            (async () => {
                using lock = await mutex.lock();
                // defer(() => lock.unlock());

                await sleep(50);
                lock.value = 2;
            })(),
            (async () => {
                using lock = await mutex.lock();
                // defer(() => lock.unlock());

                await sleep(40);
                lock.value = 3;
            })(),
            (async () => {
                using lock = await mutex.lock();
                // defer(() => lock.unlock());

                await sleep(30);
                value = lock.value;
            })(),
        ]);

        strictEqual(value, 3);
    });

    it("access after unlocked", async () => {
        const mutex = new Mutex(1);
        const lock = await mutex.lock();
        lock.unlock();

        const { error: err1 } = try_(() => lock.value);
        deepStrictEqual(err1, new ReferenceError("trying to access data after unlocked"));

        const { error: err2 } = try_(() => { lock.value = 2; });
        deepStrictEqual(err2, new ReferenceError("trying to access data after unlocked"));
    });
});
