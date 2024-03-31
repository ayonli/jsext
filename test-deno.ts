import "https://unpkg.com/mocha@10.2.0/mocha.js";
import { dirname, fromFileUrl } from "https://deno.land/std@0.201.0/path/mod.ts";
import { globber } from "https://deno.land/x/globber@0.1.0/mod.ts";

(window as any).location = new URL("http://localhost:0");
mocha.setup({ ui: "bdd", reporter: "spec" });
mocha.checkLeaks();

const iterator = globber({
    cwd: dirname(fromFileUrl(import.meta.url)),
    include: ["**/*.test.ts"],
    exclude: [
        "node_modules/**/*",
        "*-node.test.ts",
        "*/**-node.test.ts",
        "*-jsdom.test.ts",
        "*/**-jsdom.test.ts",
        "*-pty.test.ts",
        "*/**-pty.test.ts"
    ],
});

for await (const file of iterator) {
    const filename: string = file.absolute;
    const url = (/^[a-zA-Z]:/.test(filename) ? "file:///" : "file://") + filename;
    await import(url);
}

mocha.run((failures: number) => {
    if (failures > 0) {
        Deno.exit(1);
    } else {
        Deno.exit(0);
    }
}).globals(["onerror"]);
