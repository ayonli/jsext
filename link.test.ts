import { deepStrictEqual, strictEqual } from "node:assert";
import jsext from "./index.ts";
import { sleep } from "./promise/index.ts";
import { Abortable } from "./run.ts";

declare var Deno: any;

describe("jsext.link", () => {
    describe("worker_threads", () => {
        // @ts-ignore
        const mod = jsext.link(() => import("./job-example.mjs"), { timeout: 500 });

        it("return", async () => {
            // @ts-ignore
            strictEqual(await mod.greet("World"), "Hi, World");
        });

        it("yield", async () => {
            // @ts-ignore
            const iter = mod.sequence(["foo", "bar"]);
            const words: string[] = [];

            for await (const word of iter) {
                words.push(word);
            }

            deepStrictEqual(words, ["foo", "bar"]);
            strictEqual(await Promise.resolve(iter), "foo, bar");
        });

        it("timeout", async () => {
            // @ts-ignore
            const [err, res] = await jsext.try(mod.takeTooLong("foobar"));
            strictEqual(res, undefined);
            deepStrictEqual(err, new Error("operation timeout after 500ms"));
        });

        it("abort", async () => {
            // @ts-ignore
            const job = mod.takeTooLong("foobar") as Promise<string> & Abortable;

            const [[err, res]] = await Promise.all([
                jsext.try(job),
                sleep(300).then(() => job.abort()),
            ]);
            strictEqual(res, undefined);
            deepStrictEqual(err, null);

            // @ts-ignore
            const job2 = mod.takeTooLong("foobar") as Promise<string> & Abortable;
            const [[err2, res2]] = await Promise.all([
                jsext.try(job2),
                sleep(300).then(() => job2.abort(new Error("something went wrong"))),
            ]);
            strictEqual(res2, undefined);
            deepStrictEqual(err2, new Error("something went wrong"));
        });
    });

    if (typeof Deno === "object") {
        return;
    }

    describe("child_process", () => {
        // @ts-ignore
        const mod = jsext.link(() => import("./job-example.mjs"), {
            timeout: 500,
            adapter: "child_process",
        });

        it("return", async () => {
            // @ts-ignore
            strictEqual(await mod.greet("World"), "Hi, World");
        });

        it("yield", async () => {
            // @ts-ignore
            const iter = mod.sequence(["foo", "bar"]);
            const words: string[] = [];

            for await (const word of iter) {
                words.push(word);
            }

            deepStrictEqual(words, ["foo", "bar"]);
            strictEqual(await Promise.resolve(iter), "foo, bar");
        });

        it("timeout", async () => {
            // @ts-ignore
            const [err, res] = await jsext.try(mod.takeTooLong("foobar"));
            strictEqual(res, undefined);
            deepStrictEqual(err, new Error("operation timeout after 500ms"));
        });

        it("abort", async () => {
            // @ts-ignore
            const job = mod.takeTooLong("foobar") as Promise<string> & Abortable;

            const [[err, res]] = await Promise.all([
                jsext.try(job),
                sleep(300).then(() => job.abort()),
            ]);
            strictEqual(res, undefined);
            deepStrictEqual(err, null);

            // @ts-ignore
            const job2 = mod.takeTooLong("foobar") as Promise<string> & Abortable;
            const [[err2, res2]] = await Promise.all([
                jsext.try(job2),
                sleep(300).then(() => job2.abort(new Error("something went wrong"))),
            ]);
            strictEqual(res2, undefined);
            deepStrictEqual(err2, new Error("something went wrong"));
        });
    });
});
