import { strictEqual } from "node:assert";
import jsext from "../index.ts";

describe("jsext.pipe", () => {
    it("pipe", () => {
        const { value } = jsext.pipe("10")
            .pipe(parseInt)
            .pipe(Math.pow, 2)
            .pipe(v => v.toFixed(2));

        strictEqual(value, "100.00");
    });
});
