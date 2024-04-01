/// <reference path="./lib.deno.d.ts" />
import { ok } from "node:assert";
import jsext from "./index.ts";

describe("jsext.readAll", () => {
    it("jsext.readAll", async () => {
        const file = await Deno.open("./package.json", { read: true });
        const chunks = await jsext.readAll(file.readable);

        ok(chunks.length > 0);
    });
});
