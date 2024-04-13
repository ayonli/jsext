import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { UTIMap } from "./filetype/constants.ts";
import { getExtensions, getMIME, getUTI } from "./filetype.ts";

describe("filetype", () => {
    it("getUTI", () => {
        for (const [uti, values] of Object.entries(UTIMap)) {
            values.forEach(value => {
                strictEqual(getUTI(value), uti);
            });
        }

        strictEqual(getUTI("*.png"), "public.png");
    });

    it("getMIME", () => {
        for (const [uti, values] of Object.entries(UTIMap)) {
            const mime = getMIME(uti);

            if (values.some(value => value.includes("/"))) {
                ok(values.some(value => value === mime));
            }
        }

        strictEqual(getMIME(".png"), "image/png");
    });

    it("getExtensions", () => {
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

        strictEqual(getExtensions("*.png").join(","), ".png");

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
