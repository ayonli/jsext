/**
 * Universal file system APIs for Node.js, Bun, Deno, and the browser.
 * 
 * In the browser, this module uses the Origin Private File System. The module
 * is experimental and may not be available in some browsers.
 * @module
 * @experimental
 */

import { abortable } from "./async.ts";
import { text } from "./bytes.ts";
import { isBrowserWindow, isDedicatedWorker, isDeno, isNodeLike, isSharedWorker } from "./env.ts";
import { getMIME } from "./filetype.ts";
import { FileInfo, DirEntry } from "./fs/types.ts";
import { basename, dirname, extname, join, sanitize, split } from "./path.ts";
import { toAsyncIterable } from "./reader.ts";
import _try from "./try.ts";

export { FileInfo, DirEntry };

async function getDirHandle(path: string, options: {
    create?: boolean;
    /** Used when `create` is `true`. */
    recursive?: boolean;
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<FileSystemDirectoryHandle> {
    if (typeof location === "object" && typeof location.origin === "string") {
        path = path.stripStart(location.origin);
    }

    const { create = false, recursive = false } = options;
    const paths = split(path.stripStart("/")).filter(p => p !== ".");
    const root = options.root ?? await navigator.storage.getDirectory();
    let dir = root;

    for (let i = 0; i < paths.length; i++) {
        const _path = paths[i]!;
        dir = await dir.getDirectoryHandle(_path, {
            create: create && (recursive || (i === paths.length - 1)),
        });
    }

    return dir;
}

/**
 * Returns the information of the given file or directory.
 */
export async function stat(target: string | FileSystemFileHandle | FileSystemDirectoryHandle, options: {
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<FileInfo> {
    if (typeof target === "object") {
        if (typeof (target as any).getFile === "function") {
            const info = await (target as FileSystemFileHandle).getFile();
            return {
                name: target.name,
                kind: "file",
                size: info.size,
                type: info.type ?? getMIME(extname(target.name)) ?? "",
                mtime: new Date(info.lastModified),
                atime: null,
                birthtime: null,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        } else {
            return {
                name: target.name,
                kind: "directory",
                size: 0,
                type: "",
                mtime: null,
                atime: null,
                birthtime: null,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        }
    }

    const path = sanitize(target);

    if (isDeno) {
        const stat = await Deno.stat(path);
        return {
            name: basename(path),
            kind: stat.isDirectory
                ? "directory"
                : stat.isSymlink
                    ? "symlink"
                    : "file",
            size: stat.size,
            type: getMIME(extname(path)) ?? "",
            mtime: stat.mtime ?? null,
            atime: stat.atime ?? null,
            birthtime: stat.birthtime ?? null,
            isBlockDevice: stat.isBlockDevice ?? false,
            isCharDevice: stat.isCharDevice ?? false,
            isFIFO: stat.isFile ?? false,
            isSocket: stat.isSocket ?? false,
        };
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        const stat = await fs.stat(path);
        return {
            name: basename(path),
            kind: stat.isDirectory()
                ? "directory"
                : stat.isSymbolicLink()
                    ? "symlink"
                    : "file",
            size: stat.size,
            type: getMIME(extname(path)) ?? "",
            mtime: stat.mtime ?? null,
            atime: stat.atime ?? null,
            birthtime: stat.birthtime ?? null,
            isBlockDevice: stat.isBlockDevice(),
            isCharDevice: stat.isCharacterDevice(),
            isFIFO: stat.isFIFO(),
            isSocket: stat.isSocket(),
        };
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const parent = dirname(path);
        const name = basename(path);
        const dir = await getDirHandle(parent, options);
        const [err, file] = await _try(dir.getFileHandle(name));

        if (file) {
            const info = await file.getFile();
            return {
                name,
                kind: "file",
                size: info.size,
                type: info.type ?? getMIME(extname(name)) ?? "",
                mtime: new Date(info.lastModified),
                atime: null,
                birthtime: null,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        } else if ((err as DOMException).name === "TypeMismatchError") {
            return {
                name,
                kind: "directory",
                size: 0,
                type: "",
                mtime: null,
                atime: null,
                birthtime: null,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        } else {
            throw err;
        }
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Checks if the given path exists.
 */
export async function exists(path: string, options: {
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<boolean> {
    try {
        await stat(path, options);
        return true;
    } catch {
        return false;
    }
}

/**
 * Creates a new directory with the given path.
 */
export async function mkdir(path: string, options: {
    /**
     * Whether to create parent directories if they do not exist.
     */
    recursive?: boolean;
    /**
     * The permission mode of the directory.
     * 
     * NOTE: This option is ignored in the browser.
     * @default 0o777
     */
    mode?: number;
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<void> {
    path = sanitize(path);

    if (isDeno) {
        await Deno.mkdir(path, options);
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        await fs.mkdir(path, options);
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        await getDirHandle(path, { create: true, ...options });
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Reads the directory of the given path and iterates its entries.
 */
export async function* readDir(target: string | FileSystemDirectoryHandle, options: {
    /**
     * Whether to read the sub-directories recursively.
     */
    recursive?: boolean;
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): AsyncIterable<DirEntry> {
    if (typeof target === "object") {
        yield* readDirHandle(target, options);
        return;
    }

    const path = sanitize(target);

    if (isDeno) {
        yield* (async function* read(path: string, base: string): AsyncIterable<DirEntry> {
            for await (const entry of Deno.readDir(path)) {
                const _entry: DirEntry = {
                    name: entry.name,
                    kind: entry.isDirectory
                        ? "directory"
                        : entry.isSymlink
                            ? "symlink"
                            : "file",
                    path: join(base, entry.name),
                };

                yield _entry;

                if (options?.recursive && entry.isDirectory) {
                    yield* read(join(path, entry.name), _entry.path);
                }
            }
        })(path, "");
    } else if (isNodeLike) {
        const fs = await import("fs/promises");

        yield* (async function* read(path: string, base: string): AsyncIterable<DirEntry> {
            const entries = await fs.readdir(path, { withFileTypes: true });

            for (const entry of entries) {
                const _entry: DirEntry = {
                    name: entry.name,
                    kind: entry.isDirectory()
                        ? "directory"
                        : entry.isSymbolicLink()
                            ? "symlink"
                            : "file",
                    path: join(base, entry.name),
                };

                yield _entry;

                if (options?.recursive && entry.isDirectory()) {
                    yield* read(join(path, entry.name), _entry.path);
                }
            }
        })(path, "");
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const dir = await getDirHandle(path, { root: options.root });
        yield* readDirHandle(dir, options);
    }
}

async function* readDirHandle(dir: FileSystemDirectoryHandle, options: {
    base?: string,
    recursive?: boolean;
} = {}): AsyncIterable<DirEntry> {
    const { base = "", recursive = false } = options;
    const entries = (dir as any)["entries"]() as AsyncIterable<[string, FileSystemHandle]>;

    for await (const [_, entry] of entries) {
        const _entry: DirEntry = {
            name: entry.name,
            kind: entry.kind,
            path: join(base, entry.name),
            handle: entry as FileSystemFileHandle | FileSystemDirectoryHandle,
        };

        yield _entry;

        if (recursive && entry.kind === "directory") {
            yield* readDirHandle(entry as FileSystemDirectoryHandle, {
                base: _entry.path,
                recursive,
            });
        }
    }
}

/**
 * Reads the content of the given file in bytes.
 */
export async function readFile(target: string | FileSystemFileHandle, options: {
    signal?: AbortSignal;
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<Uint8Array> {
    if (typeof target === "object") {
        return await readFileHandle(target, options);
    }

    const filename = sanitize(target);

    if (isDeno) {
        return await Deno.readFile(filename, options);
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        return await fs.readFile(filename, options);
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const path = dirname(filename);
        const name = basename(filename);
        const dir = await getDirHandle(path, { root: options.root });
        const handle = await dir.getFileHandle(name);

        return await readFileHandle(handle, options);
    } else {
        throw new Error("Unsupported runtime");
    }
}

async function readFileHandle(handle: FileSystemFileHandle, options: {
    signal?: AbortSignal | undefined;
}): Promise<Uint8Array> {
    const file = await handle.getFile();
    const arr = new Uint8Array(file.size);
    let offset = 0;
    let reader = toAsyncIterable(file.stream());

    if (options.signal) {
        reader = abortable(reader, options.signal);
    }

    for await (const chunk of reader) {
        arr.set(chunk, offset);
        offset += chunk.length;
    }

    return arr;
}

/**
 * Reads the content of the given file as text.
 */
export async function readFileAsText(target: string | FileSystemFileHandle, options: {
    signal?: AbortSignal;
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<string> {
    if (typeof target === "object") {
        return text(await readFileHandle(target, options));
    }

    const filename = sanitize(target);

    if (isDeno) {
        return await Deno.readTextFile(filename, options);
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        return await fs.readFile(filename, {
            encoding: "utf-8",
            signal: options.signal,
        });
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return text(await readFile(filename, options));
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Writes the given data to the file.
 */
export async function writeFile(target: string | FileSystemFileHandle, data: Uint8Array | string, options: {
    /**
     * Append the data to the file instead of overwriting it.
     */
    append?: boolean;
    /**
     * Permissions always applied to file.
     * 
     * NOTE: This option is ignored in the browser.
     * @default 0o666
     */
    mode?: number;
    signal?: AbortSignal;
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<void> {
    if (typeof target === "object") {
        return await writeFileHandle(target, data, options);
    }

    const filename = sanitize(target);

    if (isDeno) {
        if (typeof data === "string") {
            return await Deno.writeTextFile(filename, data, options);
        } else {
            return await Deno.writeFile(filename, data, options);
        }
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        const { append, ...rest } = options;
        return await fs.writeFile(filename, data, {
            flag: options?.append ? "a" : "w",
            ...rest,
        });
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const path = dirname(filename);
        const name = basename(filename);
        const dir = await getDirHandle(path, { root: options.root });
        const handle = await dir.getFileHandle(name, { create: true });

        return await writeFileHandle(handle, data, options);
    } else {
        throw new Error("Unsupported runtime");
    }
}

async function writeFileHandle(handle: FileSystemFileHandle, data: Uint8Array | string, options: {
    append?: boolean;
    signal?: AbortSignal;
}): Promise<void> {
    const writer = await handle.createWritable({
        keepExistingData: options?.append ?? false,
    });

    if (options.append) {
        const file = await handle.getFile();
        file.size && writer.seek(file.size);
    }

    if (options.signal) {
        const { signal } = options;

        if (signal.aborted) {
            throw signal.reason;
        } else {
            signal.addEventListener("abort", () => {
                writer.abort(signal.reason);
            });
        }
    }

    await writer.write(data);
    await writer.close();
}

/**
 * Removes the file or directory of the given path from the file system.
 */
export async function remove(path: string, options: {
    /**
     * Whether to delete the sub-directories and files recursively. This option
     * is required in order to remove a non-empty directory.
     */
    recursive?: boolean;
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
} = {}): Promise<void> {
    path = sanitize(path);

    if (isDeno) {
        await Deno.remove(path, options);
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        await fs.rm(path, options);
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const parent = dirname(path);
        const name = basename(path);
        const dir = await getDirHandle(parent, { root: options.root });
        await dir.removeEntry(name, options);
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Renames the file or directory from the old path to the new path.
 */
export async function rename(oldPath: string, newPath: string, options: {
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
}): Promise<void> {
    oldPath = sanitize(oldPath);
    newPath = sanitize(newPath);

    if (isDeno) {
        await Deno.rename(oldPath, newPath);
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        await fs.rename(oldPath, newPath);
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return await copyInBrowser(oldPath, newPath, {
            root: options.root,
            cut: true,
        });
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Copies the file or directory from the old path to the new path.
 * 
 * NOTE: If the old path is a file and the new path is a directory, the file
 * will be copied to the new directory with the same name.
 */
export async function copy(oldPath: string, newPath: string, options: {
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser.
     */
    root?: FileSystemDirectoryHandle | undefined;
}): Promise<void> {
    oldPath = sanitize(oldPath);
    newPath = sanitize(newPath);

    if (isDeno) {
        const oldStat = await Deno.stat(oldPath);

        if (oldStat.isDirectory) {
            const entries = readDir(oldPath, { recursive: true });

            for await (const entry of entries) {
                const _newPath = join(newPath, entry.name);

                if (entry.kind === "file") {
                    await Deno.copyFile(entry.path, _newPath);
                } else if (entry.kind === "directory") {
                    await Deno.mkdir(_newPath);
                }
            }
        } else {
            try {
                const newStat = await Deno.stat(newPath);

                if (newStat.isDirectory) {
                    newPath = join(newPath, basename(oldPath));
                }

                await Deno.copyFile(oldPath, newPath);
            } catch {
                await Deno.copyFile(oldPath, newPath);
            }
        }
    } else if (isNodeLike) {
        const fs = await import("fs/promises");
        const oldStat = await fs.stat(oldPath);

        if (oldStat.isDirectory()) {
            const entries = readDir(oldPath, { recursive: true });

            for await (const entry of entries) {
                const _newPath = join(newPath, entry.name);

                if (entry.kind === "file") {
                    await fs.copyFile(entry.path, _newPath);
                } else if (entry.kind === "directory") {
                    await fs.mkdir(_newPath);
                }
            }
        } else {
            try {
                const newStat = await fs.stat(newPath);

                if (newStat.isDirectory()) {
                    newPath = join(newPath, basename(oldPath));
                }

                await fs.copyFile(oldPath, newPath);
            } catch {
                await fs.copyFile(oldPath, newPath);
            }
        }
    } else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return await copyInBrowser(oldPath, newPath, {
            root: options.root,
        });
    } else {
        throw new Error("Unsupported runtime");
    }
}

async function copyInBrowser(oldPath: string, newPath: string, options: {
    root?: FileSystemDirectoryHandle | undefined;
    cut?: boolean;
} = {}): Promise<void> {
    const oldParent = dirname(oldPath);
    const oldName = basename(oldPath);

    let oldDir = await getDirHandle(oldParent, { root: options.root });
    const [oldErr, oldFile] = await _try(oldDir.getFileHandle(oldName));

    if (oldFile) {
        const newParent = dirname(newPath);
        const newName = basename(newPath);
        let newDir = await getDirHandle(newParent, { root: options.root });
        const [newErr, newFile] = await _try(newDir.getFileHandle(newName, {
            create: true,
        }));

        if (newFile) {
            const src = (await oldFile.getFile()).stream();
            const dest = await newFile.createWritable();

            await src.pipeTo(dest);

            if (options.cut) {
                await oldDir.removeEntry(oldName);
            }
        } else if ((newErr as DOMException).name === "TypeMismatchError" && !options.cut) {
            newDir = await newDir.getDirectoryHandle(newName);
            const newFile = await newDir.getFileHandle(oldName, { create: true });
            const src = (await oldFile.getFile()).stream();
            const dest = await newFile.createWritable();

            await src.pipeTo(dest);
        } else {
            throw newErr;
        }
    } else if ((oldErr as DOMException).name === "TypeMismatchError") {
        const parent = oldDir;
        oldDir = await oldDir.getDirectoryHandle(oldName);
        const newDir = await getDirHandle(newPath, { create: true });

        await (async function copyDir(
            oldDir: FileSystemDirectoryHandle,
            newDir: FileSystemDirectoryHandle
        ): Promise<void> {
            const entries = (oldDir as any)["entries"]() as AsyncIterable<[string, FileSystemHandle]>;

            for await (const [_, entry] of entries) {
                if (entry.kind === "file") {
                    const oldFile = await (entry as FileSystemFileHandle).getFile();
                    const newFile = await newDir.getFileHandle(entry.name, {
                        create: true,
                    });
                    const reader = oldFile.stream();
                    const writer = await newFile.createWritable();

                    await reader.pipeTo(writer);

                    if (options.cut) {
                        await oldDir.removeEntry(entry.name);
                    }
                } else {
                    const newSubDir = await newDir.getDirectoryHandle(entry.name, {
                        create: true,
                    });
                    await copyDir(entry as FileSystemDirectoryHandle, newSubDir);

                    if (options.cut) {
                        await oldDir.removeEntry(entry.name);
                    }
                }
            }
        })(oldDir, newDir);

        if (options.cut) {
            await parent.removeEntry(oldName);
        }
    } else {
        throw oldErr;
    }
}
