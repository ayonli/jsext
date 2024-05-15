import { deepStrictEqual, ok, strictEqual } from "node:assert";
import fs from "node:fs/promises";
import { isBun, isDeno } from "./env.ts";
import jsext, { _try } from "./index.ts";
import { readAsArray, readAsText } from "./reader.ts";
import { platform } from "./runtime.ts";
import { join, resolve, sep } from "./path.ts";
import bytes, { equals } from "./bytes.ts";
import {
    EOL,
    FileInfo,
    chmod,
    copy,
    ensureDir,
    exists,
    link,
    mkdir,
    readDir,
    readFile,
    readFileAsText,
    readFileAsFile,
    readFileAsStream,
    readLink,
    readTree,
    remove,
    rename,
    stat,
    truncate,
    utimes,
    writeFile,
    writeLines,
} from "./fs.ts";

describe("fs", () => {
    it("EOL", () => {
        if (typeof Deno === "object" && Deno.build?.os === "windows") {
            strictEqual(EOL, "\r\n");
        } else if (typeof process === "object" && process.platform === "win32") {
            strictEqual(EOL, "\r\n");
        } else {
            strictEqual(EOL, "\n");
        }
    });

    describe("exists", () => {
        it("file", async () => {
            const ok = await exists("./fs.ts");
            strictEqual(ok, true);
        });

        it("directory", async () => {
            const ok = await exists("./fs");
            strictEqual(ok, true);
        });
    });

    describe("stat", () => {
        it("file", async () => {
            const stat1 = await stat("./fs.ts");

            if (isDeno) {
                const stat2 = await Deno.stat("./fs.ts");
                deepStrictEqual(stat1, {
                    name: "fs.ts",
                    kind: "file",
                    size: stat2.size,
                    type: "video/mp2t",
                    mtime: stat2.mtime,
                    atime: stat2.atime,
                    birthtime: stat2.birthtime,
                    mode: stat2.mode ?? 0,
                    uid: stat2.uid ?? 0,
                    gid: stat2.gid ?? 0,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            } else {
                const stat2 = await fs.stat("./fs.ts");
                deepStrictEqual(stat1, {
                    name: "fs.ts",
                    kind: "file",
                    size: stat2.size,
                    type: "video/mp2t",
                    mtime: stat2.mtime,
                    atime: stat2.atime,
                    birthtime: stat2.birthtime,
                    mode: stat2.mode,
                    uid: stat2.uid,
                    gid: stat2.gid,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            }
        });

        it("directory", async () => {
            const stat1 = await stat("./fs");

            if (isDeno) {
                const stat2 = await Deno.stat("./fs");
                deepStrictEqual(stat1, {
                    name: "fs",
                    kind: "directory",
                    size: stat2.size,
                    type: "",
                    mtime: stat2.mtime,
                    atime: stat2.atime,
                    birthtime: stat2.birthtime,
                    mode: stat2.mode ?? 0,
                    uid: stat2.uid ?? 0,
                    gid: stat2.gid ?? 0,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            } else {
                const stat2 = await fs.stat("./fs");
                deepStrictEqual(stat1, {
                    name: "fs",
                    kind: "directory",
                    size: stat2.size,
                    type: "",
                    mtime: stat2.mtime,
                    atime: stat2.atime,
                    birthtime: stat2.birthtime,
                    mode: stat2.mode,
                    uid: stat2.uid,
                    gid: stat2.gid,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            }
        });

        it("symlink", jsext.func(async (defer) => {
            const src = resolve("./fs");
            const dest = resolve("./fs-ln");

            if (isDeno) {
                await Deno.symlink(src, dest, { type: "dir" });
            } else {
                await fs.symlink(src, dest, "dir");
            }
            defer(async () => {
                if (isDeno) {
                    await Deno.remove(dest);
                } else {
                    fs.unlink(dest);
                }
            });

            const stat1 = await stat(dest);

            if (isDeno) {
                const _stat = await Deno.lstat(dest);
                deepStrictEqual(stat1, {
                    name: "fs-ln",
                    kind: "symlink",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    mode: _stat.mode ?? 0,
                    uid: _stat.uid ?? 0,
                    gid: _stat.gid ?? 0,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            } else {
                const _stat = await fs.lstat(dest);
                deepStrictEqual(stat1, {
                    name: "fs-ln",
                    kind: "symlink",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    mode: _stat.mode,
                    uid: _stat.uid,
                    gid: _stat.gid,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            }

            const stat2 = await stat(dest, { followSymlink: true });

            if (isDeno) {
                const _stat = await Deno.stat(dest);
                deepStrictEqual(stat2, {
                    name: "fs-ln",
                    kind: "directory",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    mode: _stat.mode ?? 0,
                    uid: _stat.uid ?? 0,
                    gid: _stat.gid ?? 0,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            } else {
                const _stat = await fs.stat(dest);
                deepStrictEqual(stat2, {
                    name: "fs-ln",
                    kind: "directory",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    mode: _stat.mode,
                    uid: _stat.uid,
                    gid: _stat.gid,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                } as FileInfo);
            }
        }));
    });

    describe("mkdir", () => {
        it("default", jsext.func(async (defer) => {
            await mkdir("./tmp");
            defer(() => fs.rmdir("./tmp", { recursive: true }));

            const _stat = await stat("./tmp");
            strictEqual(_stat.name, "tmp");
            strictEqual(_stat.kind, "directory");
        }));

        it("recursive", jsext.func(async (defer) => {
            await mkdir("./tmp/a/b/c", { recursive: true });
            defer(() => fs.rmdir("./tmp", { recursive: true }));

            const _stat = await stat("./tmp/a/b/c");
            strictEqual(_stat.name, "c");
            strictEqual(_stat.kind, "directory");
        }));

        it("mode", jsext.func(async function (defer) {
            if (platform() === "windows") {
                this.skip();
            }

            await mkdir("./tmp", { mode: 0o755 });
            defer(() => fs.rmdir("./tmp", { recursive: true }));

            if (isDeno) {
                const _stat = await Deno.stat("./tmp");
                strictEqual((_stat.mode ?? 0) & 0o755, 0o755);
            } else {
                const _stat = await fs.stat("./tmp");
                strictEqual(_stat.mode & 0o755, 0o755);
            }
        }));
    });

    describe("ensureDir", () => {
        it("ignore", jsext.func(async (defer) => {
            const path = "./tmp/a/b/c";
            await mkdir(path, { recursive: true });
            defer(() => remove("./tmp", { recursive: true }));

            await ensureDir(path);
        }));

        it("create", jsext.func(async (defer) => {
            const path = "./tmp/a/b/c";
            await ensureDir(path);
            defer(() => remove("./tmp", { recursive: true }));

            const _stat = await stat(path);
            strictEqual(_stat.name, "c");
            strictEqual(_stat.kind, "directory");
        }));

        it("mode", jsext.func(async function (defer) {
            if (platform() === "windows") {
                this.skip();
            }

            const path = "./tmp/a/b/c";
            await ensureDir(path, { mode: 0o755 });
            defer(() => remove("./tmp", { recursive: true }));

            if (isDeno) {
                const _stat = await Deno.stat(path);
                strictEqual((_stat.mode ?? 0) & 0o755, 0o755);
            } else {
                const _stat = await fs.stat(path);
                strictEqual(_stat.mode & 0o755, 0o755);
            }
        }));
    });

    describe("readDir", () => {
        it("default", async () => {
            const files = await readAsArray(readDir("./esm"));

            for (const file of files) {
                ok(file.name && file.name !== "");
                strictEqual(file.path, file.name);

                try {
                    strictEqual(file.kind, "file");
                } catch {
                    strictEqual(file.kind, "directory");
                }
            }
        });

        it("recursive", async () => {
            const files = await readAsArray(readDir("./esm", { recursive: true }));

            for (const file of files) {
                ok(file.name && file.name !== "");
                ok(file.path && file.path !== "");

                if (file.path !== file.name) {
                    ok(file.path.endsWith(sep + file.name));
                }

                try {
                    strictEqual(file.kind, "file");
                } catch {
                    strictEqual(file.kind, "directory");
                }
            }
        });

        it("symlink", jsext.func(async (defer) => {
            if (isDeno) {
                await Deno.symlink("./fs/types.ts", "./fs/types-ln.ts", { type: "file" });
            } else {
                await fs.symlink("./fs/types.ts", "./fs/types-ln.ts", "file");
            }
            defer(async () => {
                if (isDeno) {
                    await Deno.remove("./fs/types-ln.ts");
                } else {
                    fs.unlink("./fs/types-ln.ts");
                }
            });

            const files = await readAsArray(readDir("./fs"));
            ok(files.some(file => file.name === "types-ln.ts" && file.kind === "symlink"));
        }));
    });

    describe("readTree", () => {
        it("default", jsext.func(async (defer) => {
            const root = "./tmp";
            const dir1 = "./tmp/a";
            const dir2 = "./tmp/b/c";
            const file1 = "./tmp/d.txt";
            const file2 = "./tmp/b/e.txt";

            await mkdir(dir1, { recursive: true });
            await mkdir(dir2, { recursive: true });
            await writeFile(file1, "Hello, world!");
            await writeFile(file2, "Hello, world!");
            defer(() => remove(root, { recursive: true }));

            const tree = await readTree(root);

            deepStrictEqual(tree, {
                name: "tmp",
                kind: "directory",
                path: "",
                handle: undefined,
                children: [
                    {
                        name: "a",
                        kind: "directory",
                        path: "a",
                        handle: undefined,
                        children: [],
                    },
                    {
                        name: "b",
                        kind: "directory",
                        path: "b",
                        handle: undefined,
                        children: [
                            {
                                name: "c",
                                kind: "directory",
                                path: join("b", "c"),
                                handle: undefined,
                                children: [],
                            },
                            {
                                name: "e.txt",
                                kind: "file",
                                path: join("b", "e.txt"),
                                handle: undefined,
                            },
                        ],
                    },
                    {
                        name: "d.txt",
                        kind: "file",
                        path: "d.txt",
                        handle: undefined,
                    },
                ],
            });
        }));
    });

    describe("readFile", () => {
        it("default", async () => {
            const data = await readFile("./fs.ts");

            if (isDeno) {
                const _data = await Deno.readFile("./fs.ts");
                ok(equals(data, _data));
            } else {
                const _data = await fs.readFile("./fs.ts");
                ok(equals(data, _data));
            }
        });

        it("signal", async function () {
            if (typeof AbortController === "undefined" || isBun) {
                this.skip();
            }

            const controller = new AbortController();
            const signal = controller.signal;
            const promise = readFile("./fs.ts", { signal });

            controller.abort();

            const [err, res] = await jsext._try(promise);
            ok(err instanceof Error);
            strictEqual(err.name, "AbortError");
            strictEqual(res, undefined);
        });
    });

    describe("readFileAsText", () => {
        it("default", async () => {
            const text = await readFileAsText("./fs.ts");

            if (isDeno) {
                const _text = await Deno.readTextFile("./fs.ts");
                strictEqual(text, _text);
            } else {
                const _text = await fs.readFile("./fs.ts", "utf8");
                strictEqual(text, _text);
            }
        });

        it("signal", async function () {
            if (typeof AbortController === "undefined" || isBun) {
                this.skip();
            }

            const controller = new AbortController();
            const signal = controller.signal;
            const promise = readFileAsText("./fs.ts", { signal });

            controller.abort();

            const [err, res] = await jsext._try(promise);
            ok(err instanceof Error);
            strictEqual(err.name, "AbortError");
            strictEqual(res, undefined);
        });
    });

    describe("readFileAsFile", () => {
        if (typeof File === "undefined") {
            return;
        }

        it("default", async () => {
            const file = await readFileAsFile("./fs.ts");
            let _file: File;

            if (isDeno) {
                _file = new File([await Deno.readFile("./fs.ts")], "fs.ts", {
                    type: "video/mp2t"
                });
            } else {
                _file = new File([await fs.readFile("./fs.ts")], "fs.ts", {
                    type: "video/mp2t"
                });
            }

            ok(file instanceof File);
            strictEqual(file.name, _file.name);
            strictEqual(file.size, _file.size);
            strictEqual(file.type, _file.type);
        });

        it("signal", async function () {
            if (typeof AbortController === "undefined" || isBun) {
                this.skip();
            }

            const controller = new AbortController();
            const signal = controller.signal;
            const promise = readFileAsFile("./fs.ts", { signal });

            controller.abort();

            const [err, res] = await jsext._try(promise);
            ok(err instanceof Error);
            strictEqual(err.name, "AbortError");
            strictEqual(res, undefined);
        });
    });

    describe("readFileAsStream", () => {
        if (typeof ReadableStream === "undefined") {
            return;
        }

        it("default", async () => {
            const stream = readFileAsStream("./fs.ts");
            ok(stream instanceof ReadableStream);

            const text = await readAsText(stream);
            const _text = await readFileAsText("./fs.ts");
            strictEqual(text, _text);
        });
    });

    describe("writeFile", () => {
        const path = "./tmp.txt";

        after(async () => {
            await remove(path);
        });

        it("text", async () => {
            const output = "Hello, world!";
            await writeFile("./tmp.txt", output);

            const text = await readFileAsText(path);
            strictEqual(text, output);
        });

        it("Uint8Array", async () => {
            const output = bytes("Hello, world!");
            await writeFile("./tmp.txt", output);

            const data = await readFile(path);
            ok(equals(data, output));
        });

        it("ArrayBuffer", async () => {
            const output = bytes("Hello, world!");
            await writeFile("./tmp.txt", output.buffer);

            const data = await readFile(path);
            ok(equals(data, output));
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream === "undefined") {
                this.skip();
            }

            const output = bytes("Hello, world!");
            const stream = new ReadableStream({
                pull(controller) {
                    controller.enqueue(output);
                    controller.close();
                }
            });

            await writeFile("./tmp.txt", stream);

            const data = await readFile(path);
            ok(equals(data, output));
        });

        it("Blob", async function () {
            if (typeof Blob === "undefined") {
                this.skip();
            }

            const output = new Blob([bytes("Hello, world!")]);
            await writeFile("./tmp.txt", output);

            const data = await readFile(path);
            ok(equals(data, bytes("Hello, world!")));
        });

        it("File", async function () {
            if (typeof File === "undefined") {
                this.skip();
            }

            const output = new File([bytes("Hello, world!")], "tmp.txt");
            await writeFile("./tmp.txt", output);

            const data = await readFile(path);
            ok(equals(data, bytes("Hello, world!")));
        });

        it("signal", async function () {
            if (typeof AbortController === "undefined" || isBun) {
                this.skip();
            }

            const controller = new AbortController();
            const signal = controller.signal;
            const promise = writeFile(path, "Hello, world!", { signal });

            controller.abort();

            const [err] = await jsext._try(promise);
            ok(err instanceof Error);
            strictEqual(err.name, "AbortError");
        });

        it("append", async () => {
            const output = "Hello, world!";
            await writeFile(path, output);
            await writeFile(path, output, { append: true });

            const text = await readFileAsText(path);
            strictEqual(text, output + output);
        });

        it("mode", jsext.func(async function (defer) {
            if (platform() === "windows") {
                this.skip();
            }

            const path = "./tmp1.txt";
            await writeFile(path, "Hello, world!", { mode: 0o755 });
            defer(() => remove(path));

            if (isDeno) {
                const _stat = await Deno.stat(path);
                strictEqual((_stat.mode ?? 0) & 0o755, 0o755);
            } else {
                const _stat = await fs.stat(path);
                strictEqual(_stat.mode & 0o755, 0o755);
            }
        }));
    });

    describe("writeLines", () => {
        const path = "./tmp.txt";

        after(async () => {
            await remove(path).catch(() => null);
        });

        it("has old content", async () => {
            let content = "This is the first line.\r\n"
                + "This is the second line.\r\n"
                + "This is the third line.\n";
            await writeFile(path, content);

            const lines = [
                "new line 1",
                "new line 2",
            ];
            await writeLines(path, lines);

            const text1 = await readFileAsText(path);
            strictEqual(text1, lines[0] + "\r\n" + lines[1] + "\r\n");

            content = "This is the first line.\n"
                + "This is the second line.\n"
                + "This is the third line.\r\n";

            await writeFile(path, content);
            await writeLines(path, lines);

            const text2 = await readFileAsText(path);
            strictEqual(text2, lines[0] + "\n" + lines[1] + "\n");
        });

        it("do not have old content", async () => {
            await writeFile(path, "");

            const lines = [
                "new line 1",
                "new line 2",
            ];
            await writeLines(path, lines);

            const text = await readFileAsText(path);
            strictEqual(text, lines[0] + EOL + lines[1] + EOL);
        });

        it("append", async () => {
            let content = "This is the first line.\r\n"
                + "This is the second line.\r\n"
                + "This is the third line.\n";
            await writeFile(path, content);

            const lines = [
                "new line 1",
                "new line 2",
            ];
            await writeLines(path, lines, { append: true });

            const text1 = await readFileAsText(path);
            strictEqual(text1, content + "\r\n" + lines[0] + "\r\n" + lines[1] + "\r\n");

            content = content.slice(0, -1) + "\r";

            await writeFile(path, content);
            await writeLines(path, lines, { append: true });

            const text2 = await readFileAsText(path);
            strictEqual(text2, content + "\n" + lines[0] + "\r\n" + lines[1] + "\r\n");

            content = "This is the first line.\n"
                + "This is the second line.\r\n"
                + "This is the third line.\n";

            await writeFile(path, content);
            await writeLines(path, lines, { append: true });

            const text3 = await readFileAsText(path);
            strictEqual(text3, content + lines[0] + "\n" + lines[1] + "\n");
        });

        it("new file", jsext.func(async (defer) => {
            const path = "./tmp1.txt";
            const lines = [
                "new line 1",
                "new line 2",
            ];
            await writeLines(path, lines);
            defer(() => remove(path));

            const text = await readFileAsText(path);
            strictEqual(text, lines[0] + EOL + lines[1] + EOL);
        }));
    });

    describe("truncate", () => {
        it("default", jsext.func(async (defer) => {
            const path = "./tmp.txt";
            await writeFile(path, "Hello, world!");
            defer(() => remove(path));

            await truncate(path);

            const text = await readFileAsText(path);
            strictEqual(text, "");
        }));

        it("with size", jsext.func(async (defer) => {
            const path = "./tmp.txt";
            await writeFile(path, "Hello, world!");
            defer(() => remove(path));

            await truncate(path, 5);

            const text = await readFileAsText(path);
            strictEqual(text, "Hello");
        }));
    });

    describe("remove", () => {
        it("default", async () => {
            const path = "./tmp.txt";
            await writeFile(path, "Hello, world!");
            await remove(path);

            const ok = await exists(path);
            strictEqual(ok, false);
        });

        it("recursive", async () => {
            const path = "./tmp";
            await mkdir(path);
            await writeFile(path + "/tmp.txt", "Hello, world!");
            await remove(path, { recursive: true });

            const ok = await exists(path);
            strictEqual(ok, false);
        });
    });

    describe("rename", () => {
        it("file", jsext.func(async (defer) => {
            const src = "./tmp.txt";
            const dest = "./tmp1.txt";

            await writeFile(src, "Hello, world!");
            await rename(src, dest);
            defer(() => remove(dest));

            strictEqual(await exists(src), false);
            strictEqual(await exists(dest), true);
        }));

        it("directory", jsext.func(async (defer) => {
            const src = "./tmp";
            const dest = "./tmp1";

            await mkdir(src);
            await writeFile(src + "/tmp.txt", "Hello, world!");
            await rename(src, dest);
            defer(() => remove(dest, { recursive: true }));

            strictEqual(await exists(src), false);
            strictEqual(await exists(dest), true);
        }));
    });

    describe("copy", () => {
        it("file -> file", jsext.func(async (defer) => {
            const src = "./tmp.txt";
            const dest = "./tmp1.txt";

            await writeFile(src, "Hello, world!");
            await copy(src, dest);
            defer(() => remove(src));
            defer(() => remove(dest));

            const text = await readFileAsText(src);
            strictEqual(text, "Hello, world!");

            const text2 = await readFileAsText(dest);
            strictEqual(text2, "Hello, world!");
        }));

        it("file -> directory", jsext.func(async (defer) => {
            const src = "./tmp.txt";
            const dest = "./tmp";

            await writeFile(src, "Hello, world!");
            await mkdir(dest);
            await copy(src, dest);
            defer(() => remove(src));
            defer(() => remove(dest, { recursive: true }));

            const text = await readFileAsText(src);
            strictEqual(text, "Hello, world!");

            const text2 = await readFileAsText(dest + "/tmp.txt");
            strictEqual(text2, "Hello, world!");
        }));

        it("directory -> directory", jsext.func(async (defer) => {
            const src = "./tmp";
            const dest = "./tmp1";

            await mkdir(src + "/a/b/c", { recursive: true });
            await writeFile(src + "/a/b/c/tmp.txt", "Hello, world!");

            const srcEntries = await readAsArray(readDir(src, { recursive: true }));
            deepStrictEqual(srcEntries, [
                { name: "a", kind: "directory", path: "a" },
                { name: "b", kind: "directory", path: join("a", "b") },
                { name: "c", kind: "directory", path: join("a", "b", "c") },
                { name: "tmp.txt", kind: "file", path: join("a", "b", "c", "tmp.txt") },
            ]);

            const [err] = await _try(copy(src, dest));
            ok(err instanceof Error);
            strictEqual(err.name, "InvalidOperationError");

            await copy(src, dest, { recursive: true });
            defer(() => remove(src, { recursive: true }));
            defer(() => remove(dest, { recursive: true }));

            const destEntries = await readAsArray(readDir(dest, { recursive: true }));
            deepStrictEqual(srcEntries, destEntries);
        }));
    });

    describe("link & readLink", () => {
        it("hard link", jsext.func(async (defer) => {
            const src = "./fs.ts";
            const dest = "./fs-ln.ts";

            await link(src, dest);
            defer(() => remove(dest));

            const _stat = await stat(dest);
            strictEqual(_stat.name, "fs-ln.ts");
            strictEqual(_stat.kind, "file");
        }));

        it("symbolic link", jsext.func(async (defer) => {
            const src = resolve("./tmp");
            const dest = resolve("./tmp1");

            await mkdir(src + "/a/b/c", { recursive: true });
            await writeFile(src + "/a/b/c/tmp.txt", "Hello, world!");

            await link(src, dest, { symbolic: true });
            defer(() => remove(src, { recursive: true }));
            defer(() => remove(dest, { recursive: true }));

            const _stat = await stat(dest);
            strictEqual(_stat.name, "tmp1");
            strictEqual(_stat.kind, "symlink");

            const readPath = await readLink(dest);
            strictEqual(readPath, src);

            const srcEntries = await readAsArray(readDir(src));
            const destEntries = await readAsArray(readDir(dest));
            deepStrictEqual(srcEntries, destEntries);
        }));
    });

    it("chmod", jsext.func(async function (defer) {
        if (platform() === "windows") {
            this.skip();
        }

        const path = "./tmp.txt";
        await writeFile(path, "Hello, world!");
        defer(() => remove(path));

        await chmod(path, 0o755);

        const _stat = await stat(path);
        strictEqual(_stat.name, "tmp.txt");
        strictEqual(_stat.kind, "file");
        strictEqual(_stat.mode & 0o755, 0o755);
    }));

    it("utimes", jsext.func(async (defer) => {
        const path = "./tmp.txt";
        await writeFile(path, "Hello, world!");
        defer(() => remove(path));

        const atime1 = new Date(0);
        const mtime1 = new Date(0);
        await utimes(path, atime1, mtime1);

        const _stat1 = await stat(path);
        strictEqual(_stat1.name, "tmp.txt");
        strictEqual(_stat1.kind, "file");
        deepStrictEqual(_stat1.atime, atime1);
        deepStrictEqual(_stat1.mtime, mtime1);

        const atime2 = Math.floor(Date.now() / 1000);
        const mtime2 = Math.floor(Date.now() / 1000);
        await utimes(path, atime2, mtime2);

        const _stat2 = await stat(path);
        strictEqual(_stat2.name, "tmp.txt");
        strictEqual(_stat2.kind, "file");
        deepStrictEqual(_stat2.atime, new Date(atime2 * 1000));
        deepStrictEqual(_stat2.mtime, new Date(mtime2 * 1000));
    }));
});
