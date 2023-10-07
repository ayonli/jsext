import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";

describe("jsext.run", () => {
    it("ES Module", async () => {
        const job = await jsext.run("job-example.mjs", ["World"]);
        strictEqual(await job.result(), "Hello, World");

        const job2 = await jsext.run(() => import("./job-example.mjs"), ["World"]);
        strictEqual(await job2.result(), "Hello, World");
    });

    it("custom function", async () => {
        const job = await jsext.run("job-example.mjs", ["World"], { fn: "greet" });
        strictEqual(await job.result(), "Hi, World");

        const job2 = await jsext.run(() => import("./job-example.mjs"), ["World"], { fn: "greet" });
        strictEqual(await job2.result(), "Hi, World");
    });

    it("timeout", async () => {
        const job = await jsext.run<string, [string]>("job-example.mjs", ["foobar"], {
            fn: "takeTooLong",
            timeout: 50,
        });
        const [err, res] = await jsext.try(job.result());
        strictEqual(res, undefined);
        deepStrictEqual(err, new Error("operation timeout after 50ms"));
    });

    it("abort", async () => {
        const job = await jsext.run<string, [string]>("job-example.mjs", ["foobar"], {
            fn: "takeTooLong",
        });
        await job.abort();
        const [err, res] = await jsext.try(job.result());
        strictEqual(res, undefined);
        deepStrictEqual(err, null);
    });

    it("iterate", async () => {
        const job = await jsext.run<string, [string[]]>("job-example.mjs", [["foo", "bar"]], {
            fn: "sequence",
        });
        const words: string[] = [];

        for await (const word of job.iterate()) {
            words.push(word);
        }

        deepStrictEqual(words, ["foo", "bar"]);
        strictEqual(await job.result(), "foo, bar");

        const job2 = await jsext.run(() => import("./job-example.mjs"), [["foo", "bar"]], {
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
        const job1 = await jsext.run("job-example.mjs", ["World"], { keepAlive: true });
        strictEqual(await job1.result(), "Hello, World");

        const job2 = await jsext.run("job-example.mjs", ["World"], { fn: "greet" });
        strictEqual(job2.workerId, job1.workerId);
        strictEqual(await job2.result(), "Hi, World");

        const job3 = await jsext.run("job-example.mjs", ["World"]);
        ok(job2.workerId !== job3.workerId);
        strictEqual(await job3.result(), "Hello, World");
    });
});
