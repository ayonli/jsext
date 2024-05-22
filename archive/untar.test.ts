import { deepStrictEqual, strictEqual } from "node:assert";
import tar from "./tar.ts";
import { pick } from "../object.ts";
import Tarball, { TarEntry } from "./Tarball.ts";
import { DirEntry, createWritableStream, mkdir, readDir, remove, stat } from "../fs.ts";
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

    it("extract tarball files and restore metadata", func(async (defer) => {
        const dir = "./tmp";
        await mkdir(dir);
        defer(() => remove(dir, { recursive: true }));

        const tarball = new Tarball();

        tarball.append(null, {
            kind: "directory",
            relativePath: "foo",
            mode: 0o740,
            mtime: new Date(0),
        });
        tarball.append("Hello, World!", {
            relativePath: "foo/hello.txt",
            mode: 0o740,
            mtime: new Date(0),
        });

        const filename = "./tmp/foo.tar";
        const output = createWritableStream(filename);

        await tarball.stream().pipeTo(output);
        await untar(filename, dir);

        const stat1 = await stat("./tmp/foo");
        strictEqual(stat1.mode & 0o777, 0o740);
        strictEqual(stat1.mtime?.getTime(), 0);

        const stat2 = await stat("./tmp/foo/hello.txt");
        strictEqual(stat2.mode & 0o777, 0o740);
        strictEqual(stat2.mtime?.getTime(), 0);
    }));
});
