import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";
import { sequence } from "./number/index.ts";

describe("jsext.run", () => {
    it("ES Module", async () => {
        const job = await jsext.run("examples/worker.mjs", ["World"]);
        strictEqual(await job.result(), "Hello, World");

        const job2 = await jsext.run(() => import("./examples/worker.mjs"), ["World"]);
        strictEqual(await job2.result(), "Hello, World");
    });

    it("custom function", async () => {
        const job = await jsext.run("examples/worker.mjs", ["World"], { fn: "greet" });
        strictEqual(await job.result(), "Hi, World");

        const job2 = await jsext.run(() => import("./examples/worker.mjs"), ["World"], { fn: "greet" });
        strictEqual(await job2.result(), "Hi, World");
    });

    it("timeout", async () => {
        const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
            fn: "takeTooLong",
            timeout: 50,
        });
        const [err, res] = await jsext.try(job.result());
        strictEqual(res, undefined);
        deepStrictEqual(err, new Error("operation timeout after 50ms"));
    });

    it("abort", async () => {
        const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
            fn: "takeTooLong",
        });
        await job.abort();
        const [err, res] = await jsext.try(job.result());
        strictEqual(res, undefined);
        deepStrictEqual(err, null);

        const job2 = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
            fn: "takeTooLong",
        });
        await job2.abort(new Error("something went wrong"));
        const [err2, res2] = await jsext.try(job2.result());
        strictEqual(res2, undefined);
        deepStrictEqual(err2, new Error("something went wrong"));
    });

    it("iterate", async () => {
        const job = await jsext.run<string, [string[]]>("examples/worker.mjs", [["foo", "bar"]], {
            fn: "sequence",
        });
        const words: string[] = [];

        for await (const word of job.iterate()) {
            words.push(word);
        }

        deepStrictEqual(words, ["foo", "bar"]);
        strictEqual(await job.result(), "foo, bar");

        const job2 = await jsext.run(() => import("./examples/worker.mjs"), [["foo", "bar"]], {
            fn: "sequence",
        });
        const words2: string[] = [];

        for await (const word of job2.iterate()) {
            words2.push(word);
        }

        deepStrictEqual(words2, ["foo", "bar"]);
        strictEqual(await job2.result(), "foo, bar");
    });

    it("keep alive", async () => {
        const job1 = await jsext.run("examples/worker.mjs", ["World"], { keepAlive: true });
        strictEqual(await job1.result(), "Hello, World");

        const job2 = await jsext.run("examples/worker.mjs", ["World"], { fn: "greet" });
        strictEqual(job2.workerId, job1.workerId);
        strictEqual(await job2.result(), "Hi, World");

        const job3 = await jsext.run("examples/worker.mjs", ["World"]);
        ok(job2.workerId !== job3.workerId);
        strictEqual(await job3.result(), "Hello, World");
    });

    it("use channel", async () => {
        const channel = jsext.chan<{ value: number; done: boolean; }>();
        const job = await jsext.run<number, [typeof channel]>("examples/worker.mjs", [channel], {
            fn: "twoTimesValues",
        });

        for (const value of sequence(0, 9)) {
            await channel.push({ value, done: value === 9 });
        }

        const results = (await jsext.readAll(channel)).map(item => item.value);
        deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
        strictEqual(await job.result(), 10);
    });

    it("use transferable", async () => {
        const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        const job = await jsext.run<number, [ArrayBuffer]>("examples/worker.mjs", [
            jsext.parallel.transfer(arr.buffer)
        ], {
            fn: "transfer",
        });

        deepStrictEqual(await job.result(), 10);
        strictEqual(arr.byteLength, 0);
    });
});
