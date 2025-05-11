import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { importWasm, interop } from "./index.ts";
import { readFile } from "@jsext/fs";
import { isBun, isDeno, isNode } from "@jsext/env";
import { run } from "@jsext/cli";
import { randomPort } from "@jsext/net";
import { serve, serveStatic } from "@jsext/http";
import func from "@jsext/func";

describe("module", () => {
    describe("interop", () => {
        if (!isNode) {
            return;
        }

        it("default", async () => {
            // @ts-ignore
            let module1 = await import("../examples/module/module1.cjs");
            module1 = interop(module1);
            deepStrictEqual(Object.keys(module1).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module2 = await import("../examples/module/module2.cjs");
            module2 = interop(module2);
            deepStrictEqual(Object.keys(module2).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module3 = await import("../examples/module/module3.cjs");
            module3 = interop(module3);
            deepStrictEqual(Object.keys(module3).sort(), ["default"]);

            // @ts-ignore
            let module4 = await import("../examples/module/module4.cjs");
            module4 = interop(module4);
            deepStrictEqual(Object.keys(module4).sort(), ["default"]);
        });

        it("strict", async () => {
            // @ts-ignore
            let module1 = await import("../examples/module/module1.cjs");
            module1 = interop(module1, false);
            deepStrictEqual(Object.keys(module1).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module2 = await import("../examples/module/module2.cjs");
            module2 = interop(module2, true);
            deepStrictEqual(Object.keys(module2).sort(), ["foo", "bar", "default"].sort());

            // @ts-ignore
            let module3 = await import("../examples/module/module3.cjs");
            module3 = interop(module3, true);
            deepStrictEqual(Object.keys(module3).sort(), ["default"]);
        });

        it("no strict", async () => {
            // @ts-ignore
            let module1 = await import("../examples/module/module1.cjs");
            module1 = interop(module1, false);
            deepStrictEqual(Object.keys(module1).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module2 = await import("../examples/module/module2.cjs");
            module2 = interop(module2, false);
            deepStrictEqual(Object.keys(module2).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module3 = await import("../examples/module/module3.cjs");
            module3 = interop(module3, false);
            deepStrictEqual(Object.keys(module3).sort(), ["foo", "bar"].sort());
        });

        it("use promise", async () => {
            // @ts-ignore
            const module = await interop(import("../examples/module/module1.cjs"));
            deepStrictEqual(Object.keys(module).sort(), ["foo", "bar"].sort());
        });

        it("use async function", async () => {
            // @ts-ignore
            const module = await interop(() => import("../examples/module/module1.cjs"));
            deepStrictEqual(Object.keys(module).sort(), ["foo", "bar"].sort());
        });
    });

    describe("isMain", () => {
        it("ES Module", async () => {
            if (isNode) {
                const { stdout } = await run("node", ["./examples/module/foo.mjs"]);
                strictEqual(stdout.trim(), "foo.mjs is the main module");
            } else if (isDeno) {
                const { stdout } = await run("deno", ["run", "./examples/module/foo.mjs"]);
                strictEqual(stdout.trim(), "foo.mjs is the main module");
            } else if (isBun) {
                const { stdout } = await run("bun", ["run", "./examples/module/foo.mjs"]);
                strictEqual(stdout.trim(), "foo.mjs is the main module");
            }

            if (isNode) {
                const { stdout } = await run("node", ["./examples/module/bar.mjs"]);
                strictEqual(stdout.trim(), "bar.mjs is the main module");
            } else if (isDeno) {
                const { stdout } = await run("deno", ["run", "./examples/module/bar.mjs"]);
                strictEqual(stdout.trim(), "bar.mjs is the main module");
            } else if (isBun) {
                const { stdout } = await run("bun", ["run", "./examples/module/bar.mjs"]);
                strictEqual(stdout.trim(), "bar.mjs is the main module");
            }
        });

        it("CommonJS", async function () {
            if (isNode) {
                const { stdout } = await run("node", ["./examples/module/foo.cjs"]);
                strictEqual(stdout.trim(), "foo.cjs is the main module");
            } else if (isBun) {
                const { stdout } = await run("bun", ["run", "./examples/module/foo.cjs"]);
                strictEqual(stdout.trim(), "foo.cjs is the main module");
            }

            if (isNode) {
                const { stdout } = await run("node", ["./examples/module/bar.cjs"]);
                strictEqual(stdout.trim(), "bar.cjs is the main module");
            } else if (isBun) {
                const { stdout } = await run("bun", ["run", "./examples/module/bar.cjs"]);
                strictEqual(stdout.trim(), "bar.cjs is the main module");
            }
        });
    });

    describe("importWasm", () => {
        it("file path", async () => {
            const module = await importWasm<{
                timestamp: () => number;
            }>("./examples/convert.wasm", {
                Date: { now: Date.now },
            });

            ok(module.timestamp() > 0);

            // test cache
            const module2 = await importWasm<{
                timestamp: () => number;
            }>("./examples/convert.wasm", {
                Date: { now: Date.now },
            });

            ok(module === module2);
        });

        it("file URL", async () => {
            const module = await importWasm<{
                timestamp: () => number;
            }>(new URL("./examples/convert.wasm", import.meta.url), {
                Date: { now: Date.now },
            });

            ok(module.timestamp() > 0);

            // test cache
            const module2 = await importWasm<{
                timestamp: () => number;
            }>(new URL("./examples/convert.wasm", import.meta.url).href, {
                Date: { now: Date.now },
            });

            ok(module === module2);
        });

        it("http URL", func(async function (defer) {
            if (typeof fetch !== "function") {
                this.skip();
            }

            const port = await randomPort(8000);
            const server = serve({
                async fetch(req) {
                    const { pathname } = new URL(req.url);

                    if (pathname === "/example" || pathname.startsWith("/example/")) {
                        return await serveStatic(req, {
                            fsDir: "./examples",
                            urlPrefix: "/example",
                        });
                    }

                    return new Response("Not Found", { status: 404 });
                }
            });
            await server.ready;
            defer(() => server.close(true));

            const url = new URL(`http://localhost:${port}/example/convert.wasm`);
            const module = await importWasm<{
                timestamp: () => number;
            }>(url, {
                Date: { now: Date.now },
            });

            ok(module.timestamp() > 0);

            // test cache
            const module2 = await importWasm<{
                timestamp: () => number;
            }>(url.href, {
                Date: { now: Date.now },
            });

            ok(module === module2);
        }));

        it("WebAssembly.Module", async () => {
            const bytes = await readFile("./examples/convert.wasm");
            const _module = new WebAssembly.Module(bytes);
            const module = await importWasm<{
                timestamp: () => number;
            }>(_module, {
                Date: { now: Date.now },
            });

            ok(module.timestamp() > 0);

            // test cache
            const module2 = await importWasm<{
                timestamp: () => number;
            }>(_module, {
                Date: { now: Date.now },
            });

            ok(module === module2);
        });
    });
});
