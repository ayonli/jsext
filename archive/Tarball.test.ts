import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { stat, createReadableStream, createWritableStream, readFileAsText, remove, exists } from "../fs.ts";
import { Tarball, type TarEntryInfo } from "../archive.ts";
import { readAsText } from "../reader.ts";
import { omit } from "../object.ts";

describe("archive/Tarball", () => {
    if (typeof ReadableStream !== "function") {
        return;
    }

    const filename1 = "./archive.tar";
    const filename2 = "./archive.tar.gz";
    const files = [
        "array.ts",
        "array/base.ts",
        "fs.ts",
    ];

    const tarball1 = new Tarball();
    const tarball2 = new Tarball();

    after(() => remove(filename1));
    after(() => remove(filename2));

    it("append", async () => {
        for (const file of files) {
            const info = await stat(file);
            const [stream1, stream2] = createReadableStream(file).tee();

            tarball1.append(stream1, {
                kind: info.kind,
                relativePath: file,
                size: info.size,
                mtime: info.mtime ?? new Date(),
                mode: info.mode,
                uid: info.uid,
                gid: info.gid,
            });
            tarball2.append(stream2, {
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
        ok([...tarball1].some(entry => entry.kind === "directory"));
        strictEqual([...tarball1].length, 4);

        for (const entry of tarball1) {
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
        ok(!(await exists(filename1)));
        const output = createWritableStream(filename1);
        await tarball1.stream().pipeTo(output);
        ok(await exists(filename1));
    });

    it("stream with gzip", async () => {
        ok(!(await exists(filename2)));
        const output = createWritableStream(filename2);
        await tarball2.stream({ gzip: true }).pipeTo(output);
        ok(await exists(filename2));
    });

    it("load", async () => {
        const input = createReadableStream(filename1);
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

    it("load with gzip", async () => {
        const input = createReadableStream(filename2);
        const tarball = await Tarball.load(input, { gzip: true });

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
