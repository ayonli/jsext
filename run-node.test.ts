import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";
import { sequence } from "./number/index.ts";
import { fromObject } from "./error/index.ts";

declare var Bun: any;

describe("jsext.run", () => {
    describe("worker_threads", () => {
        it("CommonJS", async () => {
            const job = await jsext.run("examples/worker.cjs", ["World"]);
            strictEqual(await job.result(), "Hello, World");
        });

        it("ES Module", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"]);
            strictEqual(await job.result(), "Hello, World");
        });

        it("custom function", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"], { fn: "greet" });
            strictEqual(await job.result(), "Hi, World");
        });

        it("timeout", async () => {
            const [err, job] = await jsext.try(jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                timeout: 50,
            }));

            if (err) {
                strictEqual(job, undefined);
                deepStrictEqual(err, new Error("operation timeout after 50ms"));
            } else {
                const [err2, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                deepStrictEqual(err2, new Error("operation timeout after 50ms"));
            }
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
            const job1 = await jsext.run<number, [typeof channel]>("examples/worker.mjs", [channel], {
                fn: "twoTimesValues",
            });

            for (const value of sequence(0, 9)) {
                await channel.push({ value, done: value === 9 });
            }

            const results = (await jsext.readAll(channel)).map(item => item.value);
            deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
            strictEqual(await job1.result(), 10);
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

        it("send unserializable", async () => {
            const [_err] = await jsext.try(async () => await jsext.run<number, [any]>("examples/worker.mjs", [
                () => null
            ], {
                fn: "throwUnserializableError",
            }));
            const err = _err instanceof Error ? _err : fromObject(_err as any, Error);

            if (typeof Bun === "object") {
                // Currently Bun/JSCore has problem capturing the call stack in async functions,
                // so the stack may not include the current filename, we just have to test
                // if the error is captured.
                ok(err instanceof Error);
            } else {
                ok(err?.stack?.includes(import.meta.url.replace(/^(file|https?):\/\//, "")));
            }
        });

        it("receive unserializable", async () => {
            const job = await jsext.run<number, [any]>("examples/worker.mjs", [
                1
            ], {
                fn: "throwUnserializableError",
            });
            const [err] = await jsext.try(job.result());

            ok((err as DOMException)?.stack?.includes("examples/worker.mjs"));
        });
    });

    describe("child_process", async () => {
        it("CommonJS", async () => {
            const job = await jsext.run("examples/worker.cjs", ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");
        });

        it("ES Module", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");
        });

        it("custom function", async () => {
            const job = await jsext.run("examples/worker.mjs", ["World"], {
                fn: "greet",
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hi, World");
        });

        it("timeout", async () => {
            const [err, job] = await jsext.try(jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                timeout: 50,
                adapter: "child_process",
            }));

            if (err) {
                strictEqual(job, undefined);
                deepStrictEqual(err, new Error("operation timeout after 50ms"));
            } else {
                const [err2, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                deepStrictEqual(err2, new Error("operation timeout after 50ms"));
            }
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

        it("use channel", async () => {
            const channel = jsext.chan<{ value: number; done: boolean; }>();
            const job1 = await jsext.run<number, [typeof channel]>("examples/worker.mjs", [channel], {
                fn: "twoTimesValues",
                adapter: "child_process",
            });

            for (const value of sequence(0, 9)) {
                await channel.push({ value, done: value === 9 });
            }

            const results = (await jsext.readAll(channel)).map(item => item.value);
            deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
            strictEqual(await job1.result(), 10);
        });

        it("send unserializable", async () => {
            const [_err] = await jsext.try(async () => await jsext.run<number, [any]>("examples/worker.mjs", [
                () => null
            ], {
                fn: "throwUnserializableError",
                adapter: "child_process",
            }));
            const err = _err instanceof Error ? _err : fromObject(_err as any, Error);

            if (typeof Bun === "object") {
                // Currently Bun/JSCore has problem capturing the call stack in async functions,
                // so the stack may not include the current filename, we just have to test
                // if the error is captured.
                ok(err instanceof Error);

                return;
            } else {
                ok(err?.stack?.includes(import.meta.url.replace(/^(file|https?):\/\//, "")));
            }

            const [_err2] = await jsext.try(async () => await jsext.run<number, [any]>("examples/worker.mjs", [
                BigInt(1)
            ], {
                fn: "throwUnserializableError",
                adapter: "child_process",
                serialization: "json",
            }));
            const err2 = _err2 instanceof Error ? _err2 : fromObject(_err2 as any, Error);
            ok(err2?.stack?.includes(import.meta.url.replace(/^(file|https?):\/\//, "")));
        });

        it("receive unserializable", async () => {
            const job = await jsext.run<number, [any]>("examples/worker.mjs", [
                1
            ], {
                fn: "throwUnserializableError",
                adapter: "child_process",
            });
            const [err] = await jsext.try(job.result());

            ok((err as DOMException)?.stack?.includes("examples/worker.mjs"));

            if (typeof Bun === "object") {
                return;
            }

            const job2 = await jsext.run<number, [any]>("examples/worker.mjs", [
                1
            ], {
                fn: "throwUnserializableError",
                adapter: "child_process",
                serialization: "json",
            });
            const [err2] = await jsext.try(job2.result());

            ok((err2 as TypeError)?.stack?.includes("examples/worker.mjs"));
        });
    });
});
