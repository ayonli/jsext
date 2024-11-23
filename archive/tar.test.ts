import "../external/compression-stream-polyfill/index.ts";
import { deepStrictEqual } from "node:assert";
import tar from "./tar.ts";
import { pick } from "../object.ts";
import Tarball, { TarEntry } from "./Tarball.ts";
import { createReadableStream, remove } from "../fs.ts";
import { orderBy } from "../array.ts";
import func from "../func.ts";
import "../augment.ts";

describe("archive/tar", () => {
    if (typeof ReadableStream !== "function") {
        return;
    }

    const dir = "./cli";
    const filename = "./archive.tar";

    it("create tarball instance", async () => {
        const tarball = await tar(dir);
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

    it("create tarball file", func(async (defer) => {
        await tar(dir, filename);
        defer(() => remove(filename));

        const input = createReadableStream(filename);
        const tarball = await Tarball.load(input);
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
    }));

    it("create tarball file with gzip", func(async function (defer) {
        if (typeof CompressionStream === "undefined") {
            this.skip();
        }

        await tar(dir, filename, { gzip: true });
        defer(() => remove(filename));

        const input = createReadableStream(filename);
        const tarball = await Tarball.load(input, { gzip: true });
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
    }));

    it("create tarball file", func(async (defer) => {
        const filename = new URL("../archive.tar", import.meta.url);
        await tar(new URL("../cli", import.meta.url), filename);
        defer(() => remove(filename));

        const input = createReadableStream(filename);
        const tarball = await Tarball.load(input);
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
    }));
});
