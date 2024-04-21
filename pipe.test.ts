import { strictEqual } from "node:assert";
import jsext from "./index.ts";

describe("jsext.pipe", () => {
    it("valueOf", () => {
        const value = jsext.pipe("10")
            .pipe(parseInt)
            .pipe(Math.pow, 2)
            .valueOf();

        strictEqual(value, 100);
    });

    it("toString", () => {
        const value = jsext.pipe("10")
            .pipe(parseInt)
            .pipe(Math.pow, 2)
            .toString();

        strictEqual(value, "100");
    });
});
