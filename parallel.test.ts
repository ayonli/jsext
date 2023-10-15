import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";

declare var Deno: any;

describe("jsext.parallel", () => {
    // @ts-ignore
    const mod = jsext.parallel(() => import("./job-example.mjs"));

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

    if (typeof Deno !== "object") {
        it("builtin module", async () => {
            const mod2 = jsext.parallel(() => import("path"));
            const dir = await mod2.dirname("/usr/bin/curl");
            strictEqual(dir, "/usr/bin");
        });

        it("3-party module", async () => {
            // @ts-ignore
            const mod2 = jsext.parallel(() => import("glob"));
            // @ts-ignore
            const files = await mod2.sync("*.ts");
            ok(files.length > 0);
        });
    }
});
