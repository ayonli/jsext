import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";

describe("jsext.run", () => {
    describe("worker_threads", () => {
        it("CommonJS", async () => {
            const job = await jsext.run("examples/worker.cjs", ["World"]);
            strictEqual(await job.result(), "Hello, World");

            // @ts-ignore
            const job2 = await jsext.run(() => import("./examples/worker.cjs"), ["World"]);
            strictEqual(await job2.result(), "Hello, World");
        });

        it("ES Module", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"]);
            strictEqual(await job.result(), "Hello, World");

            // @ts-ignore
            const job2 = await jsext.run(() => import("./examples/worker.mjs"), ["World"]);
            strictEqual(await job2.result(), "Hello, World");
        });

        it("custom function", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"], { fn: "greet" });
            strictEqual(await job.result(), "Hi, World");

            // @ts-ignore
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

            // @ts-ignore
            for await (const word of job.iterate()) {
                words.push(word);
            }

            deepStrictEqual(words, ["foo", "bar"]);
            strictEqual(await job.result(), "foo, bar");

            // @ts-ignore
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
    });

    describe("child_process", async () => {
        it("CommonJS", async () => {
            const job = await jsext.run("examples/worker.cjs", ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");

            // @ts-ignore
            const job2 = await jsext.run(() => import("./examples/worker.cjs"), ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job2.result(), "Hello, World");
        });

        it("ES Module", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");

            // @ts-ignore
            const job2 = await jsext.run(() => import("./examples/worker.mjs"), ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job2.result(), "Hello, World");
        });

        it("custom function", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"], {
                fn: "greet",
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hi, World");

            // @ts-ignore
            const job2 = await jsext.run(() => import("./examples/worker.mjs"), ["World"], {
                fn: "greet",
                adapter: "child_process",
            });
            strictEqual(await job2.result(), "Hi, World");
        });

        it("timeout", async () => {
            const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                timeout: 50,
                adapter: "child_process",
            });
            const [err, res] = await jsext.try(job.result());
            strictEqual(res, undefined);
            deepStrictEqual(err, new Error("operation timeout after 50ms"));
        });

        it("abort", async () => {
            const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                adapter: "child_process",
            });
            await job.abort();
            const [err, res] = await jsext.try(job.result());
            strictEqual(res, undefined);
            deepStrictEqual(err, null);

            const job2 = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                adapter: "child_process",
            });
            await job2.abort(new Error("something went wrong"));
            const [err2, res2] = await jsext.try(job2.result());
            strictEqual(res2, undefined);
            deepStrictEqual(err2, new Error("something went wrong"));
        });

        it("iterate", async () => {
            const job = await jsext.run<string, [string[]]>("examples/worker.mjs", [["foo", "bar"]], {
                fn: "sequence",
                adapter: "child_process",
            });
            const words: string[] = [];

            for await (const word of job.iterate()) {
                words.push(word);
            }

            deepStrictEqual(words, ["foo", "bar"]);
            strictEqual(await job.result(), "foo, bar");

            // @ts-ignore
            const job2 = await jsext.run(() => import("./examples/worker.mjs"), [["foo", "bar"]], {
                fn: "sequence",
                adapter: "child_process",
            });
            const words2: string[] = [];

            for await (const word of job2.iterate()) {
                words2.push(word);
            }

            deepStrictEqual(words2, ["foo", "bar"]);
            strictEqual(await job2.result(), "foo, bar");
        });

        it("keep alive", async () => {
            const job1 = await jsext.run("examples/worker.mjs", ["World"], {
                keepAlive: true,
                adapter: "child_process",
            });
            strictEqual(await job1.result(), "Hello, World");

            const job2 = await jsext.run("examples/worker.mjs", ["World"], {
                fn: "greet",
                adapter: "child_process",
            });
            strictEqual(job2.workerId, job1.workerId);
            strictEqual(await job2.result(), "Hi, World");

            const job3 = await jsext.run("examples/worker.mjs", ["World"], {
                adapter: "child_process",
            });
            ok(job2.workerId !== job3.workerId);
            strictEqual(await job3.result(), "Hello, World");
        });
    });
});
