import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { stat, createReadableStream, createWritableStream, readFileAsText, remove, exists } from "../fs.ts";
import Tarball, { type TarEntry, _entries, TarTree } from "../archive/Tarball.ts";
import { readAsText } from "../reader.ts";
import { omit } from "../object.ts";
import { platform } from "../runtime.ts";

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
    after(async () => {
        try {
            await remove(filename2);
        } catch { }
    });

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
                } as TarEntry);
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
                } as TarEntry);
            }
        }
    });

    it("append File instance", function () {
        if (typeof File !== "function") {
            this.skip();
        }

        const tarball = new Tarball();
        const file1 = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
        const file2 = new File(["Hello, World!"], "bar.txt", { type: "text/plain" });

        Object.defineProperty(file2, "webkitRelativePath", {
            configurable: true,
            enumerable: true,
            writable: false,
            value: "foo/bar.txt",
        });

        tarball.append(file1);
        tarball.append(file2);

        deepStrictEqual([...tarball].map(entry => omit(entry, ["mtime"])), [
            {
                name: "hello.txt",
                kind: "file",
                relativePath: "hello.txt",
                size: 13,
                mode: 0o666,
                uid: 0,
                gid: 0,
                owner: "",
                group: "",
            },
            {
                name: "foo",
                kind: "directory",
                relativePath: "foo",
                size: 0,
                mode: 0o755,
                uid: 0,
                gid: 0,
                owner: "",
                group: "",
            },
            {
                name: "bar.txt",
                kind: "file",
                relativePath: "foo/bar.txt",
                size: 13,
                mode: 0o666,
                uid: 0,
                gid: 0,
                owner: "",
                group: "",
            },
        ] as TarEntry[]);
    });

    it("size", () => {
        if (platform() === "windows") {
            strictEqual(tarball1.size, 66048);
            strictEqual(tarball2.size, 66048);
        } else {
            strictEqual(tarball1.size, 64512);
            strictEqual(tarball2.size, 64512);
        }
    });

    it("stream", async () => {
        ok(!(await exists(filename1)));
        const output = createWritableStream(filename1);
        await tarball1.stream().pipeTo(output);
        ok(await exists(filename1));
    });

    it("stream with gzip", async function () {
        if (typeof CompressionStream === "undefined") {
            this.skip();
        }

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
        let i = 0;

        for (const entry of tarball) {
            const _entry = tarball[_entries][i++]!;
            if (entry.kind === "file") {
                const data = await readAsText(_entry.body);
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
                } as TarEntry);
            }
        }
    });

    it("load with gzip", async function () {
        if (typeof CompressionStream === "undefined") {
            this.skip();
        }

        const input = createReadableStream(filename2);
        const tarball = await Tarball.load(input, { gzip: true });

        ok([...tarball].some(entry => entry.kind === "directory"));
        strictEqual([...tarball].length, 4);
        let i = 0;

        for (const entry of tarball) {
            const _entry = tarball[_entries][i++]!;
            if (entry.kind === "file") {
                const data = await readAsText(_entry.body);
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
                } as TarEntry);
            }
        }
    });

    it("load from another tarball", async () => {
        const gzip = typeof CompressionStream === "undefined";
        const input = createReadableStream(gzip ? filename2 : filename1);
        const _tarball = await Tarball.load(input, { gzip });
        const tarball = await Tarball.load(_tarball.stream());

        ok([...tarball].some(entry => entry.kind === "directory"));
        strictEqual([...tarball].length, 4);
        let i = 0;

        for (const entry of tarball) {
            const _entry = tarball[_entries][i++]!;
            if (entry.kind === "file") {
                const data = await readAsText(_entry.body);
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
                } as TarEntry);
            }
        }
    });

    it("treeView", () => {
        const tarball = new Tarball();
        const now = new Date();

        tarball.append(null, { kind: "directory", relativePath: "foo", mtime: now });
        tarball.append("Hello, World!", { kind: "file", relativePath: "foo/hello.txt", mtime: now });

        const tree = omit(tarball.treeView(), ["mtime"]);

        deepStrictEqual(tree, {
            name: "(root)",
            kind: "directory",
            relativePath: "",
            size: 0,
            // mtime: now,
            mode: 0o755,
            uid: 0,
            gid: 0,
            owner: "",
            group: "",
            children: [
                {
                    name: "foo",
                    kind: "directory",
                    relativePath: "foo",
                    size: 0,
                    mtime: now,
                    mode: 0o755,
                    uid: 0,
                    gid: 0,
                    owner: "",
                    group: "",
                    children: [
                        {
                            name: "hello.txt",
                            kind: "file",
                            relativePath: "foo/hello.txt",
                            size: 13,
                            mtime: now,
                            mode: 0o666,
                            uid: 0,
                            gid: 0,
                            owner: "",
                            group: "",
                        },
                    ],
                },
            ],
        } as Omit<TarTree, "mtime">);
    });

    it("retrieve", () => {
        const tarball = new Tarball();
        const now = new Date();

        tarball.append(null, { kind: "directory", relativePath: "foo", mtime: now });
        tarball.append("Hello, World!", { kind: "file", relativePath: "foo/hello.txt", mtime: now });

        const entry1 = tarball.retrieve("foo/hello.txt");
        const entry2 = tarball.retrieve("foo/hello.txt", true);
        const entry3 = tarball.retrieve("bar/hello.txt");

        deepStrictEqual(entry1, {
            name: "hello.txt",
            kind: "file",
            relativePath: "foo/hello.txt",
            size: 13,
            mtime: now,
            mode: 0o666,
            uid: 0,
            gid: 0,
            owner: "",
            group: "",
        } as TarEntry);
        ok(!!entry2);
        deepStrictEqual(omit(entry2, ["header", "body"]), entry1);
        ok(entry2.header instanceof Uint8Array);
        ok(entry2.body instanceof ReadableStream);
        strictEqual(entry3, null);
    });

    it("remove", () => {
        const tarball = new Tarball();
        const now = new Date();

        tarball.append(null, { kind: "directory", relativePath: "foo", mtime: now });
        tarball.append("Hello, World!", { kind: "file", relativePath: "foo/hello.txt", mtime: now });

        const res1 = tarball.remove("foo/hello.txt");
        strictEqual(res1, true);

        const entry = tarball.retrieve("foo/hello.txt");
        strictEqual(entry, null);

        const res2 = tarball.remove("foo/bar.txt");
        strictEqual(res2, false);
    });

    it("replace", async () => {
        const tarball = new Tarball();
        const now = new Date();

        tarball.append(null, { kind: "directory", relativePath: "foo", mtime: now });
        tarball.append("Hello, World!", { kind: "file", relativePath: "foo/hello.txt", mtime: now });

        const res1 = tarball.replace("foo/hello.txt", "Hello, Deno!");
        strictEqual(res1, true);

        const entry = tarball.retrieve("foo/hello.txt", true)!;
        strictEqual(await readAsText(entry.body), "Hello, Deno!");

        const res2 = tarball.replace("foo/bar.txt", "Hello, Deno!");
        strictEqual(res2, false);

        const res3 = tarball.replace("foo/hello.txt", null, { kind: "directory" });
        strictEqual(res3, false);

        const res4 = tarball.replace("foo", "Hello, World!");
        strictEqual(res4, false);
    });
});
