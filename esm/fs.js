import { abortable } from './async.js';
import { text } from './bytes.js';
import { isDeno, isNodeLike, isBrowserWindow, isDedicatedWorker, isSharedWorker } from './env.js';
import { getMIME } from './filetype.js';
import { sanitize, basename, extname, dirname, join } from './path.js';
import { toAsyncIterable } from './reader/util.js';
import _try from './try.js';
import { split } from './path/util.js';

/**
 * Universal file system APIs for Node.js, Bun, Deno, and the browser.
 *
 * In the browser, this module uses the Origin Private File System. The module
 * is experimental and may not be available in some browsers.
 * @module
 * @experimental
 */
async function getDirHandle(path, options = {}) {
    if (typeof location === "object" && typeof location.origin === "string") {
        path = path.stripStart(location.origin);
    }
    const { create = false, recursive = false } = options;
    const paths = split(path.stripStart("/")).filter(p => p !== ".");
    const root = await navigator.storage.getDirectory();
    let dir = root;
    for (let i = 0; i < paths.length; i++) {
        const _path = paths[i];
        dir = await dir.getDirectoryHandle(_path, {
            create: create && (recursive || (i === paths.length - 1)),
        });
    }
    return dir;
}
/**
 * Returns the information of the given file or directory.
 */
async function stat(path) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    path = sanitize(path);
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
            type: (_a = getMIME(extname(path))) !== null && _a !== void 0 ? _a : "",
            mtime: (_b = stat.mtime) !== null && _b !== void 0 ? _b : null,
            atime: (_c = stat.atime) !== null && _c !== void 0 ? _c : null,
            birthtime: (_d = stat.birthtime) !== null && _d !== void 0 ? _d : null,
            isBlockDevice: (_e = stat.isBlockDevice) !== null && _e !== void 0 ? _e : false,
            isCharDevice: (_f = stat.isCharDevice) !== null && _f !== void 0 ? _f : false,
            isFIFO: (_g = stat.isFile) !== null && _g !== void 0 ? _g : false,
            isSocket: (_h = stat.isSocket) !== null && _h !== void 0 ? _h : false,
        };
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        const stat = await fs.stat(path);
        return {
            name: basename(path),
            kind: stat.isDirectory()
                ? "directory"
                : stat.isSymbolicLink()
                    ? "symlink"
                    : "file",
            size: stat.size,
            type: (_j = getMIME(extname(path))) !== null && _j !== void 0 ? _j : "",
            mtime: (_k = stat.mtime) !== null && _k !== void 0 ? _k : null,
            atime: (_l = stat.atime) !== null && _l !== void 0 ? _l : null,
            birthtime: (_m = stat.birthtime) !== null && _m !== void 0 ? _m : null,
            isBlockDevice: stat.isBlockDevice(),
            isCharDevice: stat.isCharacterDevice(),
            isFIFO: stat.isFIFO(),
            isSocket: stat.isSocket(),
        };
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const parent = dirname(path);
        const name = basename(path);
        const dir = await getDirHandle(parent);
        const [err, file] = await _try(dir.getFileHandle(name));
        if (file) {
            const info = await file.getFile();
            return {
                name,
                kind: "file",
                size: info.size,
                type: (_p = (_o = info.type) !== null && _o !== void 0 ? _o : getMIME(extname(name))) !== null && _p !== void 0 ? _p : "",
                mtime: new Date(info.lastModified),
                atime: null,
                birthtime: null,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        }
        else if (err.name === "TypeMismatchError") {
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
        }
        else {
            throw err;
        }
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Checks if the given path exists.
 */
async function exists(path) {
    try {
        await stat(path);
        return true;
    }
    catch (_a) {
        return false;
    }
}
/**
 * Creates a new directory with the given path.
 */
async function mkdir(path, options = {}) {
    var _a;
    path = sanitize(path);
    if (isDeno) {
        await Deno.mkdir(path, options);
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await fs.mkdir(path, options);
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        await getDirHandle(path, {
            create: true,
            recursive: (_a = options === null || options === void 0 ? void 0 : options.recursive) !== null && _a !== void 0 ? _a : false,
        });
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Reads the directory of the given path and iterates its entries.
 */
async function* readDir(path, options = {}) {
    path = sanitize(path);
    if (isDeno) {
        yield* (async function* read(path, base) {
            for await (const entry of Deno.readDir(path)) {
                const _entry = {
                    name: entry.name,
                    kind: entry.isDirectory
                        ? "directory"
                        : entry.isSymlink
                            ? "symlink"
                            : "file",
                    path: join(base, entry.name),
                };
                yield _entry;
                if ((options === null || options === void 0 ? void 0 : options.recursive) && entry.isDirectory) {
                    yield* read(join(path, entry.name), _entry.path);
                }
            }
        })(path, "");
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        yield* (async function* read(path, base) {
            const entries = await fs.readdir(path, { withFileTypes: true });
            for (const entry of entries) {
                const _entry = {
                    name: entry.name,
                    kind: entry.isDirectory()
                        ? "directory"
                        : entry.isSymbolicLink()
                            ? "symlink"
                            : "file",
                    path: join(base, entry.name),
                };
                yield _entry;
                if ((options === null || options === void 0 ? void 0 : options.recursive) && entry.isDirectory()) {
                    yield* read(join(path, entry.name), _entry.path);
                }
            }
        })(path, "");
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const dir = await getDirHandle(path);
        yield* (async function* read(dir, base) {
            const entries = dir["entries"]();
            for await (const [_, entry] of entries) {
                const _entry = {
                    name: entry.name,
                    kind: entry.kind,
                    path: join(base, entry.name),
                };
                yield _entry;
                if ((options === null || options === void 0 ? void 0 : options.recursive) && entry.kind === "directory") {
                    yield* read(entry, _entry.path);
                }
            }
        })(dir, "");
    }
}
/**
 * Reads the content of the given file in bytes.
 */
async function readFile(filename, options = {}) {
    filename = sanitize(filename);
    if (isDeno) {
        return await Deno.readFile(filename, options);
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        return await fs.readFile(filename, options);
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const path = dirname(filename);
        const name = basename(filename);
        const dir = await getDirHandle(path);
        const handle = await dir.getFileHandle(name);
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
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Reads the content of the given file as text.
 */
async function readFileAsText(filename, options = {}) {
    filename = sanitize(filename);
    if (isDeno) {
        return await Deno.readTextFile(filename, options);
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        return await fs.readFile(filename, {
            encoding: "utf-8",
            signal: options.signal,
        });
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return text(await readFile(filename, options));
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Writes the given data to the file.
 */
async function writeFile(filename, data, options = {}) {
    var _a;
    filename = sanitize(filename);
    if (isDeno) {
        if (typeof data === "string") {
            return await Deno.writeTextFile(filename, data, options);
        }
        else {
            return await Deno.writeFile(filename, data, options);
        }
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        const { append, ...rest } = options;
        return await fs.writeFile(filename, data, {
            flag: (options === null || options === void 0 ? void 0 : options.append) ? "a" : "w",
            ...rest,
        });
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const path = dirname(filename);
        const name = basename(filename);
        const dir = await getDirHandle(path);
        const handle = await dir.getFileHandle(name, { create: true });
        const writer = await handle.createWritable({
            keepExistingData: (_a = options === null || options === void 0 ? void 0 : options.append) !== null && _a !== void 0 ? _a : false,
        });
        if (options.append) {
            const file = await handle.getFile();
            file.size && writer.seek(file.size);
        }
        if (options.signal) {
            const { signal } = options;
            if (signal.aborted) {
                throw signal.reason;
            }
            else {
                signal.addEventListener("abort", () => {
                    writer.abort(signal.reason);
                });
            }
        }
        await writer.write(data);
        await writer.close();
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Removes the file or directory of the given path from the file system.
 */
async function remove(path, options = {}) {
    path = sanitize(path);
    if (isDeno) {
        await Deno.remove(path, options);
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await fs.rm(path, options);
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const parent = dirname(path);
        const name = basename(path);
        const dir = await getDirHandle(parent);
        await dir.removeEntry(name, options);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Renames the file or directory from the old path to the new path.
 */
async function rename(oldPath, newPath) {
    oldPath = sanitize(oldPath);
    newPath = sanitize(newPath);
    if (isDeno) {
        await Deno.rename(oldPath, newPath);
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await fs.rename(oldPath, newPath);
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return await copyInBrowser(oldPath, newPath, { cut: true });
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Copies the file or directory from the old path to the new path.
 *
 * NOTE: If the old path is a file and the new path is a directory, the file
 * will be copied to the new directory with the same name.
 */
async function copy(oldPath, newPath) {
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
                }
                else if (entry.kind === "directory") {
                    await Deno.mkdir(_newPath);
                }
            }
        }
        else {
            try {
                const newStat = await Deno.stat(newPath);
                if (newStat.isDirectory) {
                    newPath = join(newPath, basename(oldPath));
                }
                await Deno.copyFile(oldPath, newPath);
            }
            catch (_a) {
                await Deno.copyFile(oldPath, newPath);
            }
        }
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        const oldStat = await fs.stat(oldPath);
        if (oldStat.isDirectory()) {
            const entries = readDir(oldPath, { recursive: true });
            for await (const entry of entries) {
                const _newPath = join(newPath, entry.name);
                if (entry.kind === "file") {
                    await fs.copyFile(entry.path, _newPath);
                }
                else if (entry.kind === "directory") {
                    await fs.mkdir(_newPath);
                }
            }
        }
        else {
            try {
                const newStat = await fs.stat(newPath);
                if (newStat.isDirectory()) {
                    newPath = join(newPath, basename(oldPath));
                }
                await fs.copyFile(oldPath, newPath);
            }
            catch (_b) {
                await fs.copyFile(oldPath, newPath);
            }
        }
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return await copyInBrowser(oldPath, newPath);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
async function copyInBrowser(oldPath, newPath, options = {}) {
    const oldParent = dirname(oldPath);
    const oldName = basename(oldPath);
    let oldDir = await getDirHandle(oldParent);
    const [oldErr, oldFile] = await _try(oldDir.getFileHandle(oldName));
    if (oldFile) {
        const newParent = dirname(newPath);
        const newName = basename(newPath);
        let newDir = await getDirHandle(newParent);
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
        }
        else if (newErr.name === "TypeMismatchError" && !options.cut) {
            newDir = await newDir.getDirectoryHandle(newName);
            const newFile = await newDir.getFileHandle(oldName, { create: true });
            const src = (await oldFile.getFile()).stream();
            const dest = await newFile.createWritable();
            await src.pipeTo(dest);
        }
        else {
            throw newErr;
        }
    }
    else if (oldErr.name === "TypeMismatchError") {
        const parent = oldDir;
        oldDir = await oldDir.getDirectoryHandle(oldName);
        const newDir = await getDirHandle(newPath, { create: true });
        await (async function copyDir(oldDir, newDir) {
            const entries = oldDir["entries"]();
            for await (const [_, entry] of entries) {
                if (entry.kind === "file") {
                    const oldFile = await entry.getFile();
                    const newFile = await newDir.getFileHandle(entry.name, {
                        create: true,
                    });
                    const reader = oldFile.stream();
                    const writer = await newFile.createWritable();
                    await reader.pipeTo(writer);
                    if (options.cut) {
                        await oldDir.removeEntry(entry.name);
                    }
                }
                else {
                    const newSubDir = await newDir.getDirectoryHandle(entry.name, {
                        create: true,
                    });
                    await copyDir(entry, newSubDir);
                    if (options.cut) {
                        await oldDir.removeEntry(entry.name);
                    }
                }
            }
        })(oldDir, newDir);
        if (options.cut) {
            await parent.removeEntry(oldName);
        }
    }
    else {
        throw oldErr;
    }
}

export { copy, exists, mkdir, readDir, readFile, readFileAsText, remove, rename, stat, writeFile };
//# sourceMappingURL=fs.js.map
