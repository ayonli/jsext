import { ok } from "node:assert";
import { createReadStream } from "node:fs";
import jsext from "./index.ts";

describe("jsext.readAll", () => {
    it("jsext.readAll", async () => {
        const file = createReadStream("./package.json");
        const chunks = await jsext.readAll(file);

        ok(chunks.length > 0);
    });
});
