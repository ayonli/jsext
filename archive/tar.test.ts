import { deepStrictEqual } from "node:assert";
import tar from "./tar.ts";
import { pick } from "../object.ts";
import Tarball, { TarEntryInfo } from "./Tarball.ts";
import { createReadableStream, remove } from "../fs.ts";
import func from "../func.ts";

describe("archive/tar", () => {
    if (typeof ReadableStream !== "function") {
        return;
    }

    const dir = "./fs";
    const filename = "./archive.tar";

    it("create tarball instance", async () => {
        const tarball = await tar(dir);
        const entries = [...tarball].map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(entries, [
            {
                name: "fs",
                kind: "directory",
                relativePath: "fs",
            },
            {
                name: "types.ts",
                kind: "file",
                relativePath: "fs/types.ts",
            },
        ] as Partial<TarEntryInfo>[]);
    });

    it("create tarball file", func(async (defer) => {
        await tar(dir, filename);
        defer(() => remove(filename));

        const input = createReadableStream(filename);
        const tarball = await Tarball.load(input);
        const entries = [...tarball].map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(entries, [
            {
                name: "fs",
                kind: "directory",
                relativePath: "fs",
            },
            {
                name: "types.ts",
                kind: "file",
                relativePath: "fs/types.ts",
            },
        ] as Partial<TarEntryInfo>[]);
    }));

    it("create tarball file with gzip", func(async (defer) => {
        await tar(dir, filename, { gzip: true });
        defer(() => remove(filename));

        const input = createReadableStream(filename);
        const tarball = await Tarball.load(input, { gzip: true });
        const entries = [...tarball].map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(entries, [
            {
                name: "fs",
                kind: "directory",
                relativePath: "fs",
            },
            {
                name: "types.ts",
                kind: "file",
                relativePath: "fs/types.ts",
            },
        ] as Partial<TarEntryInfo>[]);
    }));
});
