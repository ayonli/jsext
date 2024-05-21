import { deepStrictEqual } from "node:assert";
import tar from "./tar.ts";
import { pick } from "../object.ts";
import { TarEntry } from "./Tarball.ts";
import { DirEntry, readDir, remove } from "../fs.ts";
import func from "../func.ts";
import untar from "./untar.ts";
import { readAsArray } from "../reader.ts";
import { join } from "../path.ts";
import { orderBy } from "../array.ts";

describe("archive/untar", () => {
    if (typeof ReadableStream !== "function") {
        return;
    }

    const dir = "./fs";
    const filename1 = "./archive.tar";
    const filename2 = "./archive.tar.gz";

    before(() => tar(dir, filename1));
    before(() => tar(dir, filename2, { gzip: true }));

    after(() => remove(filename1));
    after(() => remove(filename2));

    it("load tarball file", async () => {
        const tarball = await untar(filename1);
        const entries = [...tarball].map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(orderBy(entries, e => e.relativePath), [
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
            {
                name: "util.ts",
                kind: "file",
                relativePath: "fs/util.ts",
            },
        ] as Partial<TarEntry>[]);
    });

    it("load tarball file with gzip", async () => {
        const tarball = await untar(filename2, { gzip: true });
        const entries = [...tarball].map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(orderBy(entries, e => e.relativePath), [
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
            {
                name: "util.ts",
                kind: "file",
                relativePath: "fs/util.ts",
            },
        ] as Partial<TarEntry>[]);
    });

    it("extract tarball files", func(async (defer) => {
        const dir = "./tmp";
        await untar(filename1, dir);
        defer(() => remove(dir, { recursive: true }));

        const _entries = await readAsArray(readDir(dir, { recursive: true }));
        const entries = _entries.map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(orderBy(entries, e => e.relativePath), [
            {
                name: "fs",
                kind: "directory",
                relativePath: "fs",
            },
            {
                name: "types.ts",
                kind: "file",
                relativePath: join("fs", "types.ts"),
            },
            {
                name: "util.ts",
                kind: "file",
                relativePath: join("fs", "util.ts"),
            },
        ] as Partial<DirEntry>[]);
    }));

    it("extract tarball files with gzip", func(async (defer) => {
        const dir = "./tmp";
        await untar(filename2, dir, { gzip: true });
        defer(() => remove(dir, { recursive: true }));

        const _entries = await readAsArray(readDir(dir, { recursive: true }));
        const entries = _entries.map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(orderBy(entries, e => e.relativePath), [
            {
                name: "fs",
                kind: "directory",
                relativePath: "fs",
            },
            {
                name: "types.ts",
                kind: "file",
                relativePath: join("fs", "types.ts"),
            },
            {
                name: "util.ts",
                kind: "file",
                relativePath: join("fs", "util.ts"),
            },
        ] as Partial<DirEntry>[]);
    }));
});
