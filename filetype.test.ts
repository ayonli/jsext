import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { UTIMap } from "./filetype/constants.ts";
import { getExtensions, getMIME, getUTI } from "./filetype.ts";

describe("filetype", () => {
    it("getUTI", () => {
        strictEqual(getUTI(".png"), "public.png");
        strictEqual(getUTI("*.png"), "public.png");
        strictEqual(getUTI("public.png"), "public.png");
        strictEqual(getUTI("image/png"), "public.png");

        for (const [uti, values] of Object.entries(UTIMap)) {
            values.forEach(value => {
                strictEqual(getUTI(value), uti);
            });
        }
    });

    it("getMIME", () => {
        strictEqual(getMIME(".png"), "image/png");
        strictEqual(getMIME("*.png"), "image/png");
        strictEqual(getMIME("public.png"), "image/png");
        strictEqual(getMIME("image/png"), "image/png");

        for (const [uti, values] of Object.entries(UTIMap)) {
            const mime = getMIME(uti);

            if (values.some(value => value.includes("/"))) {
                ok(values.some(value => value === mime));
            }
        }
    });

    it("getExtensions", () => {
        strictEqual(getExtensions(".png").join(","), ".png");
        strictEqual(getExtensions("*.png").join(","), ".png");
        strictEqual(getExtensions("image/png").join(","), ".png");
        strictEqual(getExtensions("public.png").join(","), ".png");

        for (const [uti, values] of Object.entries(UTIMap)) {
            const extensions = getExtensions(uti).join(",");
            strictEqual(extensions, values.filter(v => v[0] === ".").join(","));
        }

        for (const values of Object.values(UTIMap)) {
            const mime = values.find(v => v.includes("/") && !v.endsWith("/*"));

            if (mime) {
                const extensions = getExtensions(mime).join(",");
                strictEqual(extensions, values.filter(v => v[0] === ".").join(","));
            }
        }

        deepStrictEqual(
            getExtensions("image/*").sort().join(","),
            Object.values(UTIMap)
                .filter(values => values.some(v => v !== "image/*" && v.startsWith("image/")))
                .map(values => values.filter(v => v[0] === "."))
                .flat()
                .sort()
                .join(","),
        );
    });
});
