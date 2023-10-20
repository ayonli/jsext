import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";
import { sequence } from "./number/index.ts";
import { terminate } from "./parallel.ts";

declare var Deno: any;
declare var Bun: any;

describe("jsext.parallel", () => {
    const modUrl = new URL("./examples/worker.mjs", import.meta.url).href;

    describe("worker_threads", () => {
        // @ts-ignore because allowJs is not turned on
        const mod = jsext.parallel(() => import("./examples/worker.mjs"));

        it("return", async () => {
            // @ts-ignore because allowJs is not turned on
            strictEqual(await mod.greet("World"), "Hi, World");
        });

        it("yield", async () => {
            // @ts-ignore because allowJs is not turned on
            const iter = mod.sequence(["foo", "bar"]);
            const words: string[] = [];

            for await (const word of iter) {
                words.push(word);
            }

            deepStrictEqual(words, ["foo", "bar"]);
            strictEqual(await Promise.resolve(iter), "foo, bar");
        });

        it("use error", async () => {
            const err = new Error("something went wrong");
            // @ts-ignore because allowJs is not turned on
            const returns = await mod.transferError(err);
            ok(returns instanceof Error);
            strictEqual(returns.message, err.message);
            strictEqual(returns.stack, err.stack);

            // @ts-ignore because allowJs is not turned on
            const [err2] = await jsext.try(mod.throwError("not good"));
            ok(err2 instanceof Error);
            strictEqual(err2.message, "not good");
        });

        it("use channel", async () => {
            const channel = jsext.chan<{ value: number; done: boolean; }>();
            // @ts-ignore because allowJs is not turned on
            const length = mod.twoTimesValues(channel);

            for (const value of sequence(0, 9)) {
                await channel.push({ value, done: value === 9 });
            }

            const results = (await jsext.readAll(channel)).map(item => item.value);
            deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
            strictEqual(await length, 10);
        });

        it("use transferable", async () => {
            const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
            // @ts-ignore because allowJs is not turned on
            const length = await mod.transfer(jsext.parallel.transfer(arr.buffer));

            deepStrictEqual(length, 10);
            strictEqual(arr.byteLength, 0);
        });

        it("send unserializable", async () => {
            // @ts-ignore because allowJs is not turned on
            const [err] = await jsext.try(async () => await mod.throwUnserializableError(() => null));

            if (typeof Bun === "object") {
                // Currently Bun/JSCore has problem capturing the call stack in async functions,
                // so the stack may not include the current filename, we just have to test
                // if the error is captured.
                ok(err instanceof Error);
            } else {
                ok((err as DOMException)?.stack?.includes(import.meta.url.replace(/^(file|https?):\/\//, "")));
            }
        });

        it("receive unserializable", async () => {
            // @ts-ignore because allowJs is not turned on
            const [err, res] = await jsext.try(async () => await mod.throwUnserializableError(1));

            strictEqual((err as DOMException)?.name, "DOMException");
            ok((err as DOMException)?.stack?.includes(modUrl));
        });

        it("in dependencies", async () => {
            // @ts-ignore because allowJs is not turned on
            const { default: avg } = await import("./examples/avg.js");
            strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);

            if (typeof Deno === "object" || typeof Bun === "object") {
                // @ts-ignore because allowJs is not turned on
                const { default: avg } = await import("./examples/avg.ts");
                strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
            }
        });

        it("in worker", async () => {
            const { default: avg } = jsext.parallel(() => import("./examples/avg.js"));
            strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);

            if (typeof Deno === "object" || typeof Bun === "object") {
                const { default: avg } = jsext.parallel(() => import("./examples/avg.ts"));
                strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
            }
        });

        if (typeof Deno !== "object") {
            it("builtin module", async () => {
                const mod2 = jsext.parallel(() => import("path"));
                const dir = await mod2.dirname("/usr/bin/curl");
                strictEqual(dir, "/usr/bin");

                if (parseInt(process.version.slice(1)) >= 16) {
                    const mod3 = jsext.parallel(() => import("node:path"));
                    const dir = await mod3.dirname("/usr/bin/curl");
                    strictEqual(dir, "/usr/bin");
                }
            });

            it("3-party module", async () => {
                // @ts-ignore because allowJs is not turned on
                const mod2 = jsext.parallel(() => import("glob"));
                // @ts-ignore because allowJs is not turned on
                const files = await mod2.sync("*.ts");
                ok(files.length > 0);
            });

            it("traditional CommonJS", async () => {
                // @ts-ignore because allowJs is not turned on
                const mod2 = jsext.parallel(() => import("string-hash"));
                // @ts-ignore because allowJs is not turned on
                ok((await mod2.default("Hello, World!")) > 0);
            });
        }
    });

    if (typeof Deno !== "object") {
        describe("child_process", () => {
            // @ts-ignore because allowJs is not turned on
            const mod = jsext.parallel(() => import("./examples/worker.mjs"), {
                adapter: "child_process",
            });

            after(async () => {
                await mod[terminate]();
            });

            it("return", async () => {
                // @ts-ignore because allowJs is not turned on
                strictEqual(await mod.greet("World"), "Hi, World");
            });

            it("yield", async () => {
                // @ts-ignore because allowJs is not turned on
                const iter = mod.sequence(["foo", "bar"]);
                const words: string[] = [];

                for await (const word of iter) {
                    words.push(word);
                }

                deepStrictEqual(words, ["foo", "bar"]);
                strictEqual(await Promise.resolve(iter), "foo, bar");
            });

            it("use error", async () => {
                const err = new Error("something went wrong");
                // @ts-ignore because allowJs is not turned on
                const returns = await mod.transferError(err);
                ok(returns instanceof Error);
                strictEqual(returns.message, err.message);
                strictEqual(returns.stack, err.stack);

                // @ts-ignore because allowJs is not turned on
                const [err2] = await jsext.try(mod.throwError("not good"));
                ok(err2 instanceof Error);
                strictEqual(err2.message, "not good");
            });

            it("use channel", async () => {
                const channel = jsext.chan<{ value: number; done: boolean; }>();
                // @ts-ignore because allowJs is not turned on
                const length = mod.twoTimesValues(channel);

                for (const value of sequence(0, 9)) {
                    await channel.push({ value, done: value === 9 });
                }

                const results = (await jsext.readAll(channel)).map(item => item.value);
                deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
                strictEqual(await length, 10);
            });

            it("use advanced serialization", async () => {
                // @ts-ignore because allowJs is not turned on
                const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                // @ts-ignore because allowJs is not turned on
                const res = await mod.transferTypedArray(arr);

                deepStrictEqual(res, arr);
            });

            it("use json serialization", jsext.func(async function (defer) {
                if (typeof Bun === "object") {
                    this.skip();
                }

                // @ts-ignore because allowJs is not turned on
                const mod = jsext.parallel(() => import("./examples/worker.mjs"), {
                    adapter: "child_process",
                    serialization: "json",
                });
                defer(() => mod[terminate]());

                const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
                // @ts-ignore because allowJs is not turned on
                const res = await mod.transferTypedArray(arr);

                deepStrictEqual(res, JSON.parse(JSON.stringify(arr)));
            }));

            it("send unserializable", jsext.func(async (defer) => {
                // @ts-ignore because allowJs is not turned on
                const [err] = await jsext.try(async () => await mod.throwUnserializableError(() => null));

                if (typeof Bun === "object") {
                    // Currently Bun/JSCore has problem capturing the call stack in async functions,
                    // so the stack may not include the current filename, we just have to test
                    // if the error is captured.
                    ok(err instanceof Error);

                    return;
                } else {
                    ok((err as DOMException)?.stack?.includes(import.meta.url.replace(/^(file|https?):\/\//, "")));
                }

                // @ts-ignore because allowJs is not turned on
                const mod2 = jsext.parallel(() => import("./examples/worker.mjs"), {
                    adapter: "child_process",
                    serialization: "json",
                });
                defer(() => mod2[terminate]());

                // @ts-ignore because allowJs is not turned on
                const [err2] = await jsext.try(async () => await mod2.throwUnserializableError(BigInt(1)));
                ok((err2 as DOMException)?.stack?.includes(import.meta.url.replace(/^(file|https?):\/\//, "")));
            }));

            it("receive unserializable", jsext.func(async (defer) => {
                // @ts-ignore because allowJs is not turned on
                const [err] = await jsext.try(async () => await mod.throwUnserializableError(1));
                ok((err as DOMException)?.stack?.includes(modUrl));

                if (typeof Bun === "object") {
                    return;
                }

                // @ts-ignore because allowJs is not turned on
                const mod2 = jsext.parallel(() => import("./examples/worker.mjs"), {
                    adapter: "child_process",
                    serialization: "json",
                });
                defer(() => mod2[terminate]());

                // @ts-ignore because allowJs is not turned on
                const [err2] = await jsext.try(async () => await mod2.throwUnserializableError(1));
                ok((err as DOMException)?.stack?.includes(modUrl));
            }));

            it("in dependencies", async () => {
                // @ts-ignore because allowJs is not turned on
                const { default: avg } = await import("./examples/avg.js");
                strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);

                if (typeof Deno === "object" || typeof Bun === "object") {
                    // @ts-ignore because allowJs is not turned on
                    const { default: avg } = await import("./examples/avg.ts");
                    strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
                }
            });

            it("in worker", async () => {
                const { default: avg } = jsext.parallel(() => import("./examples/avg.js"));
                strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);

                if (typeof Deno === "object" || typeof Bun === "object") {
                    const { default: avg } = jsext.parallel(() => import("./examples/avg.ts"));
                    strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
                }
            });

            it("builtin module", async () => {
                const mod2 = jsext.parallel(() => import("path"));
                const dir = await mod2.dirname("/usr/bin/curl");
                strictEqual(dir, "/usr/bin");

                if (parseInt(process.version.slice(1)) >= 16) {
                    const mod3 = jsext.parallel(() => import("node:path"));
                    const dir = await mod3.dirname("/usr/bin/curl");
                    strictEqual(dir, "/usr/bin");
                }
            });

            it("3-party module", async () => {
                // @ts-ignore because allowJs is not turned on
                const mod2 = jsext.parallel(() => import("glob"));
                // @ts-ignore because allowJs is not turned on
                const files = await mod2.sync("*.ts");
                ok(files.length > 0);
            });

            it("traditional CommonJS", async () => {
                // @ts-ignore because allowJs is not turned on
                const mod2 = jsext.parallel(() => import("string-hash"));
                // @ts-ignore because allowJs is not turned on
                ok((await mod2.default("Hello, World!")) > 0);
            });
        });
    }
});
