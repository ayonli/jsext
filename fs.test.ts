import { deepStrictEqual, ok, strictEqual } from "node:assert";
import fs from "node:fs/promises";
import { isBun, isDeno } from "./env.ts";
import jsext from "./index.ts";
import { readAsArray } from "./reader.ts";
import { sep } from "./path.ts";
import bytes, { equals } from "./bytes.ts";
import {
    copy,
    exists,
    link,
    mkdir,
    readDir,
    readFile,
    readFileAsText,
    readLink,
    remove,
    rename,
    stat,
    truncate,
    writeFile,
} from "./fs.ts";

describe("fs", () => {
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
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
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
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
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
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
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
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
            }
        });

        it("symlink", jsext.func(async (defer) => {
            if (isDeno) {
                await Deno.symlink("./fs", "./fs-tmp", { type: "dir" });
            } else {
                await fs.symlink("./fs", "./fs-tmp", "dir");
            }
            defer(async () => {
                if (isDeno) {
                    await Deno.remove("./fs-tmp");
                } else {
                    fs.unlink("./fs-tmp");
                }
            });

            const stat1 = await stat("./fs-tmp");

            if (isDeno) {
                const _stat = await Deno.lstat("./fs-tmp");
                deepStrictEqual(stat1, {
                    name: "fs-tmp",
                    kind: "symlink",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
            } else {
                const _stat = await fs.lstat("./fs-tmp");
                deepStrictEqual(stat1, {
                    name: "fs-tmp",
                    kind: "symlink",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
            }

            const stat2 = await stat("./fs-tmp", { followSymlink: true });

            if (isDeno) {
                const _stat = await Deno.stat("./fs-tmp");
                deepStrictEqual(stat2, {
                    name: "fs-tmp",
                    kind: "directory",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
            } else {
                const _stat = await fs.stat("./fs-tmp");
                deepStrictEqual(stat2, {
                    name: "fs-tmp",
                    kind: "directory",
                    size: _stat.size,
                    type: "",
                    mtime: _stat.mtime,
                    atime: _stat.atime,
                    birthtime: _stat.birthtime,
                    isBlockDevice: false,
                    isCharDevice: false,
                    isFIFO: false,
                    isSocket: false,
                });
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

        it("mode", jsext.func(async (defer) => {
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
                start(controller) {
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

        it("mode", jsext.func(async (defer) => {
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
                { name: "b", kind: "directory", path: "a/b" },
                { name: "c", kind: "directory", path: "a/b/c" },
                { name: "tmp.txt", kind: "file", path: "a/b/c/tmp.txt" },
            ]);

            await copy(src, dest);
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
            const src = "./tmp";
            const dest = "./tmp1";

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
});
