import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";
import { range } from "./number.ts";
import { fromObject } from "./error.ts";
import { sum } from "./math.ts";
import { isDeno, isNode, isNodeLike } from "./env.ts";
import { trim } from "./string.ts";
import * as path from "node:path";
import { readAsArray } from "./reader.ts";
import { toFsPath } from "./path.ts";
import { as } from "./object.ts";

const __dirname = path.dirname(toFsPath(import.meta.url));

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

        it("absolute filename", async function () {
            if (isDeno || (isNodeLike && process.platform === "win32")) {
                this.skip();
            }

            const job = await jsext.run(path.join(__dirname, "examples/worker.mjs"), ["World"]);
            strictEqual(await job.result(), "Hello, World");
        });

        it("file URL", async () => {
            {
                const job = await jsext.run(new URL("examples/worker.mjs", import.meta.url), ["World"]);
                strictEqual(await job.result(), "Hello, World");
            }

            {
                const job = await jsext.run(new URL("examples/worker.mjs", import.meta.url).href, ["World"]);
                strictEqual(await job.result(), "Hello, World");
            }
        });

        it("TS supports", async function () {
            if (isNode) {
                this.skip();
            }

            const job = await jsext.run("examples/sum2.ts", [1, 2, 3, 4, 5, 6, 7, 8, 9]);
            strictEqual(await job.result(), 45);
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
                strictEqual(as(err, Error)?.message, "Operation timeout after 50ms");
            } else {
                const [err2, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                strictEqual(as(err2, Error)?.message, "Operation timeout after 50ms");
            }
        });

        it("abort", async () => {
            const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
            });
            job.abort();
            const [err, res] = await jsext.try(job.result());
            strictEqual(res, undefined);
            strictEqual(as(err, Error)?.name, "AbortError");

            const job2 = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
            });
            const awaitResult = job2.result();
            job2.abort(new Error("something went wrong"));
            const [err2, res2] = await jsext.try(awaitResult);
            strictEqual(res2, undefined);
            deepStrictEqual(err2, new Error("something went wrong"));
        });

        it("abort with signal", async function () {
            if (typeof AbortController !== "function") {
                this.skip();
            }

            const controller = new AbortController();
            const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                signal: controller.signal,
            });

            controller.abort();
            const [err, res] = await jsext.try(job.result());
            strictEqual(res, undefined);
            strictEqual((err as Error)?.name, "AbortError");

            const controller2 = new AbortController();
            const job2 = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                signal: controller2.signal,
            });

            controller2.abort(new Error("something went wrong"));
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

            for (const value of range(0, 9)) {
                await channel.send({ value, done: value === 9 });
            }

            const results = (await readAsArray(channel)).map(item => item.value);
            deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
            strictEqual(await job1.result(), 10);

            const channel2 = jsext.chan<number>();
            const job2 = await jsext.run<number, [typeof channel2]>("examples/worker.mjs", [channel2], {
                fn: "threeTimesValues",
            });
            const _job2 = await jsext.run<number, [typeof channel2]>("examples/worker.mjs", [channel2], {
                fn: "threeTimesValues",
            });

            for (const value of range(1, 10)) {
                await channel2.send(value);
            }

            const results2: number[] = [];

            for await (const value of channel2) {
                results2.push(value);

                if (results2.length === 10) {
                    break;
                }
            }

            deepStrictEqual(await job2.result(), [3, 9, 15, 21, 27]);
            deepStrictEqual(await _job2.result(), [6, 12, 18, 24, 30]);
            strictEqual(sum(...results2), 165);
            channel2.close();
        });

        it("use transferable", async () => {
            const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            const job = await jsext.run<number, [ArrayBuffer]>("examples/worker.mjs", [
                arr.buffer
            ], {
                fn: "transfer",
            });

            strictEqual(await job.result(), 10);
            strictEqual(arr.length, 0);
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
                const __filename = trim(
                    import.meta.url.replace(/^(file|https?):\/\//, "").replace(/\//g, path.sep),
                    path.sep).replace(/^([a-zA-Z]):/, "");
                const stack = (err as Error)?.stack?.replace(/\//g, path.sep);
                ok(stack?.includes(__filename));
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

        it("nested with worker thread", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run<{
                pid: number;
                workerId: number;
                result: string;
            }>("examples/worker-nested.mjs");

            const result = await job.result();
            strictEqual(typeof result, "object");
            strictEqual(typeof result.workerId, "number");
            strictEqual(typeof result.pid, "number");
            strictEqual(result.result, "Hello, Alice");
            ok(result.workerId > 0 && result.pid > 0 && result.workerId !== result.pid);
        });

        it("nested with child process", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run<{
                pid: number;
                workerId: number;
                result: string;
            }>("examples/worker-nested.mjs", [{
                adapter: "child_process",
            }]);

            const result = await job.result();
            strictEqual(typeof result, "object");
            strictEqual(typeof result.workerId, "number");
            strictEqual(typeof result.pid, "number");
            strictEqual(result.result, "Hello, Alice");
            ok(result.workerId > 0 && result.pid > 0 && result.workerId !== result.pid);
        });
    });

    describe("child_process", async () => {
        it("CommonJS", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run("examples/worker.cjs", ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");
        });

        it("ES Module", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run("examples/worker.mjs", ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");
        });

        it("absolute filename", async function () {
            if ((isNodeLike && process.platform === "win32") || isDeno) {
                this.skip();
            }

            const job = await jsext.run(path.join(__dirname, "examples/worker.mjs"), ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");
        });

        it("File URL", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run(new URL("examples/worker.mjs", import.meta.url).href, ["World"], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hello, World");
        });

        it("TS support", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run("examples/sum2.ts", [1, 2, 3, 4, 5, 6, 7, 8, 9], {
                adapter: "child_process",
            });
            strictEqual(await job.result(), 45);
        });

        it("custom function", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run("examples/worker.mjs", ["World"], {
                fn: "greet",
                adapter: "child_process",
            });
            strictEqual(await job.result(), "Hi, World");
        });

        it("timeout", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const [err, job] = await jsext.try(jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                timeout: 50,
                adapter: "child_process",
            }));

            if (err) {
                strictEqual(job, undefined);
                strictEqual(as(err, Error)?.message, "Operation timeout after 50ms");
            } else {
                const [err2, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                strictEqual(as(err2, Error)?.message, "Operation timeout after 50ms");
            }
        });

        it("abort", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                adapter: "child_process",
            });
            job.abort();
            const [err, res] = await jsext.try(job.result());
            strictEqual(res, undefined);
            strictEqual(as(err, Error)?.name, "AbortError");

            const job2 = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                adapter: "child_process",
            });
            const awaitResult = job2.result();
            job2.abort(new Error("something went wrong"));
            const [err2, res2] = await jsext.try(awaitResult);
            strictEqual(res2, undefined);
            deepStrictEqual(err2, new Error("something went wrong"));
        });

        it("abort with signal", async function () {
            if (typeof AbortController !== "function" || isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const controller = new AbortController();
            const job = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                adapter: "child_process",
                signal: controller.signal,
            });

            controller.abort();
            const [err, res] = await jsext.try(job.result());
            strictEqual(res, undefined);
            strictEqual((err as Error)?.name, "AbortError");

            const controller2 = new AbortController();
            const job2 = await jsext.run<string, [string]>("examples/worker.mjs", ["foobar"], {
                fn: "takeTooLong",
                adapter: "child_process",
                signal: controller2.signal,
            });

            controller2.abort(new Error("something went wrong"));
            const [err2, res2] = await jsext.try(job2.result());
            strictEqual(res2, undefined);
            deepStrictEqual(err2, new Error("something went wrong"));
        });

        it("iterate", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

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

        it("keep alive", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

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

        it("use channel", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const channel = jsext.chan<{ value: number; done: boolean; }>();
            const job1 = await jsext.run<number, [typeof channel]>("examples/worker.mjs", [channel], {
                fn: "twoTimesValues",
                adapter: "child_process",
            });

            for (const value of range(0, 9)) {
                await channel.send({ value, done: value === 9 });
            }

            const results = (await readAsArray(channel)).map(item => item.value);
            deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
            strictEqual(await job1.result(), 10);

            const channel2 = jsext.chan<number>();
            const job2 = await jsext.run<number, [typeof channel2]>("examples/worker.mjs", [channel2], {
                fn: "threeTimesValues",
            });
            const _job2 = await jsext.run<number, [typeof channel2]>("examples/worker.mjs", [channel2], {
                fn: "threeTimesValues",
            });

            for (const value of range(1, 10)) {
                await channel2.send(value);
            }

            const results2: number[] = [];

            for await (const value of channel2) {
                results2.push(value);

                if (results2.length === 10) {
                    break;
                }
            }

            deepStrictEqual(await job2.result(), [3, 9, 15, 21, 27]);
            deepStrictEqual(await _job2.result(), [6, 12, 18, 24, 30]);
            strictEqual(sum(...results2), 165);
            channel2.close();
        });

        it("send unserializable", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

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
        });

        it("receive unserializable", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run<number, [any]>("examples/worker.mjs", [
                1
            ], {
                fn: "throwUnserializableError",
                adapter: "child_process",
            });
            const [err] = await jsext.try(job.result());

            ok((err as DOMException)?.stack?.includes("examples/worker.mjs"));
        });

        it("nested with worker thread", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run<{
                pid: number;
                workerId: number;
                result: string;
            }>("examples/worker-nested.mjs", [], {
                adapter: "child_process",
            });

            const result = await job.result();
            strictEqual(typeof result, "object");
            strictEqual(typeof result.workerId, "number");
            strictEqual(typeof result.pid, "number");
            strictEqual(result.result, "Hello, Alice");
            ok(result.workerId > 0 && result.pid > 0 && result.workerId !== result.pid);
        });

        it("nested with child process", async function () {
            if (isNodeLike && process.platform === "win32") {
                this.skip();
            }

            const job = await jsext.run<{
                pid: number;
                workerId: number;
                result: string;
            }>("examples/worker-nested.mjs", [{
                adapter: "child_process",
            }], {
                adapter: "child_process",
            });

            const result = await job.result();
            strictEqual(typeof result, "object");
            strictEqual(typeof result.workerId, "number");
            strictEqual(typeof result.pid, "number");
            strictEqual(result.result, "Hello, Alice");
            ok(result.workerId > 0 && result.pid > 0 && result.workerId !== result.pid);
        });
    });
});
