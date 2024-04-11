import { deepStrictEqual } from "node:assert";
import { interop } from "./module.ts";
import { isNode } from "./parallel/constants.ts";

describe("module", () => {
    describe("interop", () => {
        if (!isNode) {
            return;
        }

        it("default", async () => {
            // @ts-ignore
            let module1 = await import("./examples/module/module1.cjs");
            module1 = interop(module1);
            deepStrictEqual(Object.keys(module1).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module2 = await import("./examples/module/module2.cjs");
            module2 = interop(module2);
            deepStrictEqual(Object.keys(module2).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module3 = await import("./examples/module/module3.cjs");
            module3 = interop(module3);
            deepStrictEqual(Object.keys(module3).sort(), ["default"]);

            // @ts-ignore
            let module4 = await import("./examples/module/module4.cjs");
            module4 = interop(module4);
            deepStrictEqual(Object.keys(module4).sort(), ["default"]);
        });

        it("strict", async () => {
            // @ts-ignore
            let module1 = await import("./examples/module/module1.cjs");
            module1 = interop(module1, false);
            deepStrictEqual(Object.keys(module1).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module2 = await import("./examples/module/module2.cjs");
            module2 = interop(module2, true);
            deepStrictEqual(Object.keys(module2).sort(), ["foo", "bar", "default"].sort());

            // @ts-ignore
            let module3 = await import("./examples/module/module3.cjs");
            module3 = interop(module3, true);
            deepStrictEqual(Object.keys(module3).sort(), ["default"]);
        });

        it("no strict", async () => {
            // @ts-ignore
            let module1 = await import("./examples/module/module1.cjs");
            module1 = interop(module1, false);
            deepStrictEqual(Object.keys(module1).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module2 = await import("./examples/module/module2.cjs");
            module2 = interop(module2, false);
            deepStrictEqual(Object.keys(module2).sort(), ["foo", "bar"].sort());

            // @ts-ignore
            let module3 = await import("./examples/module/module3.cjs");
            module3 = interop(module3, false);
            deepStrictEqual(Object.keys(module3).sort(), ["foo", "bar"].sort());
        });

        it("use promise", async () => {
            // @ts-ignore
            const module = await interop(import("./examples/module/module1.cjs"));
            deepStrictEqual(Object.keys(module).sort(), ["foo", "bar"].sort());
        });

        it("use async function", async () => {
            // @ts-ignore
            const module = await interop(() => import("./examples/module/module1.cjs"));
            deepStrictEqual(Object.keys(module).sort(), ["foo", "bar"].sort());
        });
    });
});
