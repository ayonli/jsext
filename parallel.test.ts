import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";

declare var Deno: any;
declare var Bun: any;

describe("jsext.parallel", () => {
    // @ts-ignore
    const mod = jsext.parallel(() => import("./examples/worker.mjs"));

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

    it("in js dependencies", async () => {
        // @ts-ignore
        const { default: avg } = await import("./examples/avg.js");
        strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
    });

    if (typeof Deno === "object" || typeof Bun === "object") {
        it("in ts dependencies", async () => {
            // @ts-ignore
            const { default: avg } = await import("./examples/avg.ts");
            strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
        });
    }

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
            // @ts-ignore
            const mod2 = jsext.parallel(() => import("glob"));
            // @ts-ignore
            const files = await mod2.sync("*.ts");
            ok(files.length > 0);
        });

        it("traditional CommonJS", async () => {
            // @ts-ignore
            const mod2 = jsext.parallel(() => import("string-hash"));
            // @ts-ignore
            ok((await mod2.default("Hello, World!")) > 0);
        });
    }
});
