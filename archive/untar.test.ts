import "../external/compression-stream-polyfill/index.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import tar from "./tar.ts";
import { pick } from "../object.ts";
import Tarball, { TarEntry } from "./Tarball.ts";
import { DirEntry, createWritableStream, exists, mkdir, readDir, readFileAsText, remove, stat } from "../fs.ts";
import func from "../func.ts";
import untar from "./untar.ts";
import { readAsArray } from "../reader.ts";
import { join } from "../path.ts";
import { orderBy } from "../array.ts";
import { platform } from "../runtime.ts";

describe("archive/untar", () => {
    if (typeof ReadableStream !== "function") {
        return;
    }

    const dir = "./cli";
    const filename1 = "./archive.tar";
    const filename2 = "./archive.tar.gz";

    before(() => tar(dir, filename1));
    before(() => tar(dir, filename2, { gzip: typeof CompressionStream === "function" }));

    after(() => remove(filename1));
    after(() => remove(filename2));

    it("load tarball file", async () => {
        const tarball = await untar(filename1);
        const entries = [...tarball].map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(orderBy(entries, e => e.relativePath), [
            {
                name: "cli",
                kind: "directory",
                relativePath: "cli",
            },
            {
                name: "common.ts",
                kind: "file",
                relativePath: "cli/common.ts",
            },
            {
                name: "constants.ts",
                kind: "file",
                relativePath: "cli/constants.ts",
            },
        ] as Partial<TarEntry>[]);
    });

    it("load tarball file with gzip", async function () {
        if (typeof CompressionStream !== "function") {
            this.skip();
        }

        const tarball = await untar(filename2, { gzip: true });
        const entries = [...tarball].map(entry => pick(entry, ["name", "kind", "relativePath"]));
        deepStrictEqual(orderBy(entries, e => e.relativePath), [
            {
                name: "cli",
                kind: "directory",
                relativePath: "cli",
            },
            {
                name: "common.ts",
                kind: "file",
                relativePath: "cli/common.ts",
            },
            {
                name: "constants.ts",
                kind: "file",
                relativePath: "cli/constants.ts",
            },
        ] as Partial<TarEntry>[]);
    });

    it("extract tarball files", func(async (defer) => {
        const outDir = "./tmp";
        await untar(filename1, outDir);
        defer(() => remove(outDir, { recursive: true }));

        const _entries = await readAsArray(readDir(outDir, { recursive: true }));
        const entries = orderBy(
            _entries.map(entry => pick(entry, ["name", "kind", "relativePath"])),
            e => e.relativePath);

        deepStrictEqual(entries, [
            {
                name: "cli",
                kind: "directory",
                relativePath: "cli",
            },
            {
                name: "common.ts",
                kind: "file",
                relativePath: join("cli", "common.ts"),
            },
            {
                name: "constants.ts",
                kind: "file",
                relativePath: join("cli", "constants.ts"),
            },
        ] as Partial<DirEntry>[]);

        for (const entry of entries) {
            if (entry.kind === "file") {
                const content1 = await readFileAsText(join(outDir, entry.relativePath));
                const content2 = await readFileAsText(entry.relativePath);
                strictEqual(content1, content2);
            } else if (entry.kind === "directory") {
                const ok = await exists(entry.relativePath);
                strictEqual(ok, true);
            }
        }
    }));

    it("extract tarball files with gzip", func(async function (defer) {
        if (typeof CompressionStream !== "function") {
            this.skip();
        }

        const outDir = "./tmp";
        await untar(filename2, outDir, { gzip: true });
        defer(() => remove(outDir, { recursive: true }));

        const _entries = await readAsArray(readDir(outDir, { recursive: true }));
        const entries = orderBy(
            _entries.map(entry => pick(entry, ["name", "kind", "relativePath"])),
            e => e.relativePath);

        deepStrictEqual(entries, [
            {
                name: "cli",
                kind: "directory",
                relativePath: "cli",
            },
            {
                name: "common.ts",
                kind: "file",
                relativePath: join("cli", "common.ts"),
            },
            {
                name: "constants.ts",
                kind: "file",
                relativePath: join("cli", "constants.ts"),
            },
        ] as Partial<DirEntry>[]);

        for (const entry of entries) {
            if (entry.kind === "file") {
                const content1 = await readFileAsText(join(outDir, entry.relativePath));
                const content2 = await readFileAsText(entry.relativePath);
                strictEqual(content1, content2);
            } else if (entry.kind === "directory") {
                const ok = await exists(entry.relativePath);
                strictEqual(ok, true);
            }
        }
    }));

    it("extract tarball files from another tarball", func(async function (defer) {
        const gzip = typeof CompressionStream === "function";
        const outDir = "./tmp";
        const tarball = await untar(gzip ? filename2 : filename1, { gzip });
        await untar(tarball.stream(), outDir);
        defer(() => remove(outDir, { recursive: true }));

        const _entries = await readAsArray(readDir(outDir, { recursive: true }));
        const entries = orderBy(
            _entries.map(entry => pick(entry, ["name", "kind", "relativePath"])),
            e => e.relativePath);

        deepStrictEqual(entries, [
            {
                name: "cli",
                kind: "directory",
                relativePath: "cli",
            },
            {
                name: "common.ts",
                kind: "file",
                relativePath: join("cli", "common.ts"),
            },
            {
                name: "constants.ts",
                kind: "file",
                relativePath: join("cli", "constants.ts"),
            },
        ] as Partial<DirEntry>[]);

        for (const entry of entries) {
            if (entry.kind === "file") {
                const content1 = await readFileAsText(join(outDir, entry.relativePath));
                const content2 = await readFileAsText(entry.relativePath);
                strictEqual(content1, content2);
            } else if (entry.kind === "directory") {
                const ok = await exists(entry.relativePath);
                strictEqual(ok, true);
            }
        }
    }));

    it("extract tarball files and restore metadata", func(async function (defer) {
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
        platform() === "windows" || strictEqual(stat1.mode & 0o777, 0o740);
        strictEqual(stat1.mtime?.getTime(), 0);

        const stat2 = await stat("./tmp/foo/hello.txt");
        platform() === "windows" || strictEqual(stat2.mode & 0o777, 0o740);
        strictEqual(stat2.mtime?.getTime(), 0);
    }));

    it("listen to the progress event", func(async (defer) => {
        const outDir = "./tmp";
        defer(() => remove(outDir, { recursive: true }));
        let messages: string[] = [];

        await untar(filename1, outDir, {
            onProgress(event) {
                if (event.lengthComputable) {
                    const percent = Math.round(event.loaded / event.total * 100);
                    messages.push(`Extracting: ${percent}%`);
                } else {
                    messages.push(`Extracting: ${event.loaded} bytes`);
                }
            },
        });

        ok(messages.length > 0);
        ok(messages.at(-1) === "Extracting: 100%");
    }));

    it("file URL support", func(async (defer) => {
        const filename = new URL("../archive.tar", import.meta.url);
        const outDir = new URL("../tmp", import.meta.url);
        await untar(filename, outDir);
        defer(() => remove(outDir, { recursive: true }));

        const _entries = await readAsArray(readDir(outDir, { recursive: true }));
        const entries = orderBy(
            _entries.map(entry => pick(entry, ["name", "kind", "relativePath"])),
            e => e.relativePath);

        deepStrictEqual(entries, [
            {
                name: "cli",
                kind: "directory",
                relativePath: "cli",
            },
            {
                name: "common.ts",
                kind: "file",
                relativePath: join("cli", "common.ts"),
            },
            {
                name: "constants.ts",
                kind: "file",
                relativePath: join("cli", "constants.ts"),
            },
        ] as Partial<DirEntry>[]);

        for (const entry of entries) {
            if (entry.kind === "file") {
                const content1 = await readFileAsText(join(outDir.href, entry.relativePath));
                const content2 = await readFileAsText(entry.relativePath);
                strictEqual(content1, content2);
            } else if (entry.kind === "directory") {
                const ok = await exists(entry.relativePath);
                strictEqual(ok, true);
            }
        }
    }));
});
