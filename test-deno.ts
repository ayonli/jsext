import "https://unpkg.com/mocha@10.2.0/mocha.js";
import { dirname, fromFileUrl } from "https://deno.land/std@0.201.0/path/mod.ts";
import { globber } from "https://deno.land/x/globber@0.1.0/mod.ts";

declare var Deno: any;
(window as any).location = new URL("http://localhost:0");
mocha.setup({ ui: "bdd", reporter: "spec" });
mocha.checkLeaks();

const iterator = globber({
    cwd: dirname(fromFileUrl(import.meta.url)),
    include: ["*.test.ts", "*/**.test.ts"],
    exclude: ["*-node.test.ts", "*/**-node.test.ts"],
});

for await (const file of iterator) {
    await import(file.absolute);
}

mocha.run((failures: number) => {
    if (failures > 0) {
        Deno.exit(1);
    } else {
        Deno.exit(0);
    }
}).globals(["onerror"]);
