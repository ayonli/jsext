import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { stat, createReadableStream, createWritableStream, readFileAsText, remove, exists } from "./fs.ts";
import { Tarball, type TarEntryInfo } from "./archive.ts";
import { readAsText } from "./reader.ts";
import { omit } from "./object.ts";

describe("archive", () => {
    if (typeof ReadableStream !== "function") {
        return;
    }

    const filename = "./archive.tar";
    const files = [
        "array.ts",
        "array/base.ts",
        "fs.ts",
    ];

    const tarball = new Tarball();

    after(() => remove(filename));

    it("append", async () => {
        for (const file of files) {
            const info = await stat(file);
            const stream = createReadableStream(file);
            tarball.append(stream, {
                kind: info.kind,
                relativePath: file,
                size: info.size,
                mtime: info.mtime ?? new Date(),
                mode: info.mode,
                uid: info.uid,
                gid: info.gid,
            });
        }

        // auto-generate a directory
        ok([...tarball].some(entry => entry.kind === "directory"));
        strictEqual([...tarball].length, 4);

        for (const entry of tarball) {
            if (entry.kind === "file") {
                const info = await stat(entry.relativePath);
                deepStrictEqual(omit(entry, ["relativePath", "stream"]), {
                    name: info.name,
                    kind: info.kind,
                    size: info.size,
                    mtime: info.mtime,
                    mode: info.mode,
                    uid: info.uid,
                    gid: info.gid,
                    owner: "",
                    group: "",
                } as TarEntryInfo);
            } else if (entry.kind === "directory") {
                ok(entry.mtime instanceof Date);
                deepStrictEqual(omit(entry, ["relativePath", "mtime", "stream"]), {
                    name: "array",
                    kind: "directory",
                    size: 0,
                    mode: 0o755,
                    uid: 0,
                    gid: 0,
                    owner: "",
                    group: "",
                } as TarEntryInfo);
            }
        }
    });

    it("stream", async () => {
        ok(!(await exists(filename)));
        const output = createWritableStream(filename);
        await tarball.stream().pipeTo(output);
        ok(await exists(filename));
    });

    it("load", async () => {
        const input = createReadableStream(filename);
        const tarball = await Tarball.load(input);

        ok([...tarball].some(entry => entry.kind === "directory"));
        strictEqual([...tarball].length, 4);

        for (const entry of tarball) {
            if (entry.kind === "file") {
                const data = await readAsText(entry.stream);
                const text = await readFileAsText(entry.relativePath);
                strictEqual(data, text);
            } else if (entry.kind === "directory") {
                ok(entry.mtime instanceof Date);
                deepStrictEqual(omit(entry, ["relativePath", "mtime", "stream"]), {
                    name: "array",
                    kind: "directory",
                    size: 0,
                    mode: 0o755,
                    uid: 0,
                    gid: 0,
                    owner: "",
                    group: "",
                } as TarEntryInfo);
            }
        }
    });
});

