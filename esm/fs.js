import { orderBy, startsWith } from './array.js';
import { abortable } from './async.js';
import { text } from './bytes.js';
import { isDeno, isNodeLike } from './env.js';
import { as } from './object.js';
import Exception from './error/Exception.js';
import { getMIME } from './filetype.js';
import { dirname, basename, extname, join } from './path.js';
import { readAsArray, toReadableStream, readAsArrayBuffer } from './reader.js';
import { resolveReadableStream, toAsyncIterable } from './reader/util.js';
import { platform } from './runtime.js';
import { stripStart } from './string.js';
import _try from './try.js';
import { split } from './path/util.js';

/**
 * Universal file system APIs for both server and browser applications.
 *
 * This module is guaranteed to work in the following environments:
 *
 * - Node.js
 * - Deno
 * - Bun
 * - Modern browsers
 *
 * We can also use the {@link runtime} function to check whether the runtime
 * has file system support. When `runtime().fsSupport` is `true`, this module
 * should work properly.
 *
 * In most browsers, this module uses the
 * [Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).
 * In Chromium browsers, this module can also access the device's local file
 * system via `window.showOpenFilePicker()` and `window.showDirectoryPicker()`.
 *
 * **Exceptions:**
 *
 * When a file system operation fails, this module throws an {@link Exception}
 * with one of the following names:
 *
 * - `NotFoundError`: The file or directory does not exist.
 * - `NotAllowedError`: The operation is not allowed, such as being blocked by
 *   the permission system.
 * - `AlreadyExistsError`: The file or directory already exists.
 * - `IsDirectoryError`: The path is a directory, not a file.
 * - `NotDirectoryError`: The path is a file, not a directory.
 * - `InvalidOperationError`: The operation is not supported, such as trying to
 *   copy a directory without the `recursive` option.
 * - `BusyError`: The file is busy, such as being locked by another program.
 * - `InterruptedError`: The operation is interrupted by the underlying file
 *   system.
 * - `FileTooLargeError`: The file is too large, or the file system doesn't have
 *   enough space to store the new content.
 * - `FilesystemLoopError`:  Too many symbolic links were encountered when
 *   resolving the filename.
 *
 * Other errors may also be thrown by the runtime, such as `TypeError`.
 *
 * @experimental
 * @module
 */
/**
 * Platform-specific end-of-line marker. The value is `\r\n` in Windows
 * server-side environments, and `\n` elsewhere.
 */
const EOL = (() => {
    if (isDeno) {
        return Deno.build.os === "windows" ? "\r\n" : "\n";
    }
    else if (typeof process === "object" && typeof process.platform === "string") {
        return process.platform === "win32" ? "\r\n" : "\n";
    }
    else {
        return "\n";
    }
})();
function getErrorName(err) {
    if (err.constructor === Error) {
        return err.constructor.name;
    }
    else {
        return err.name;
    }
}
/**
 * Wraps a raw file system error to a predefined error by this module.
 *
 * @param type Used for `FileSystemHandle` operations.
 */
function wrapFsError(err, type = undefined) {
    if (err instanceof Error && !(err instanceof Exception) && !(err instanceof TypeError)) {
        const errName = getErrorName(err);
        const errCode = err.code;
        if (errName === "NotFoundError"
            || errName === "NotFound"
            || errCode === "ENOENT"
            || errCode === "ENOTFOUND") {
            return new Exception(err.message, { name: "NotFoundError", code: 404, cause: err });
        }
        else if (errName === "NotAllowedError"
            || errName === "PermissionDenied"
            || errName === "InvalidStateError"
            || errName === "SecurityError"
            || errName === "EACCES"
            || errCode === "EPERM"
            || errCode === "ERR_ACCESS_DENIED") {
            return new Exception(err.message, { name: "NotAllowedError", code: 403, cause: err });
        }
        else if (errName === "AlreadyExists"
            || errCode === "EEXIST"
            || errCode === "ERR_FS_CP_EEXIST") {
            return new Exception(err.message, { name: "AlreadyExistsError", code: 409, cause: err });
        }
        else if ((errName === "TypeMismatchError" && type === "file")
            || errName === "IsADirectory"
            || errCode === "EISDIR"
            || errCode === "ERR_FS_EISDIR") {
            return new Exception(err.message, { name: "IsDirectoryError", code: 415, cause: err });
        }
        else if ((errName === "TypeMismatchError" && type === "directory")
            || errName === "NotADirectory"
            || errCode === "ENOTDIR") {
            return new Exception(err.message, { name: "NotDirectoryError", code: 415, cause: err });
        }
        else if (errName === "InvalidModificationError"
            || errName === "NotSupported"
            || errCode === "ENOTEMPTY"
            || errCode === "ERR_FS_CP_EINVAL"
            || errCode === "ERR_FS_CP_FIFO_PIPE"
            || errCode === "ERR_FS_CP_DIR_TO_NON_DIR"
            || errCode === "ERR_FS_CP_NON_DIR_TO_DIR"
            || errCode === "ERR_FS_CP_SOCKET"
            || errCode === "ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY"
            || errCode === "ERR_FS_CP_UNKNOWN"
            || errCode === "ERR_FS_INVALID_SYMLINK_TYPE") {
            return new Exception(err.message, { name: "InvalidOperationError", code: 405, cause: err });
        }
        else if (errName === "NoModificationAllowedError"
            || errName === "Busy"
            || errName === "TimedOut"
            || errCode === "ERR_DIR_CONCURRENT_OPERATION") {
            return new Exception(errName, { name: "BusyError", code: 409, cause: err });
        }
        else if (errName === "Interrupted" || errCode === "ERR_DIR_CLOSED") {
            return new Exception(err.message, { name: "InterruptedError", code: 409, cause: err });
        }
        else if (errName === "QuotaExceededError"
            || errCode === "ERR_FS_FILE_TOO_LARGE") {
            return new Exception(err.message, { name: "FileTooLargeError", code: 413, cause: err });
        }
        else if (errName === "FilesystemLoop") {
            return new Exception(err.message, { name: "FilesystemLoopError", code: 508, cause: err });
        }
        else {
            return err;
        }
    }
    else if (err instanceof Error) {
        return err;
    }
    else if (typeof err === "string") {
        return new Exception(err, { code: 500, cause: err });
    }
    else {
        return new Exception("Unknown error", { code: 500, cause: err });
    }
}
/**
 * Wraps a raw file system operation so that when any error occurs, the error is
 * wrapped to a predefined error by this module.
 *
 * @param type Only used for `FileSystemHandle` operations.
 */
function rawOp(op, type = undefined) {
    return op.catch((err) => {
        throw wrapFsError(err, type);
    });
}
/**
 * Obtains the directory handle of the given path.
 *
 * NOTE: This function is only available in the browser.
 *
 * NOTE: If the `path` is not provided or is empty, the root directory handle
 * will be returned.
 */
async function getDirHandle(path = "", options = {}) {
    var _a;
    if (typeof location === "object" && typeof location.origin === "string") {
        path = stripStart(path, location.origin);
    }
    const { create = false, recursive = false } = options;
    const paths = split(stripStart(path, "/")).filter(p => p !== ".");
    const root = (_a = options.root) !== null && _a !== void 0 ? _a : await rawOp(navigator.storage.getDirectory(), "directory");
    let dir = root;
    for (let i = 0; i < paths.length; i++) {
        const _path = paths[i];
        dir = await rawOp(dir.getDirectoryHandle(_path, {
            create: create && (recursive || (i === paths.length - 1)),
        }), "directory");
    }
    return dir;
}
/**
 * Obtains the file handle of the given path.
 *
 * NOTE: This function is only available in the browser.
 */
async function getFileHandle(path, options = {}) {
    var _a;
    const dirPath = dirname(path);
    const name = basename(path);
    const dir = await getDirHandle(dirPath, { root: options.root });
    return await rawOp(dir.getFileHandle(name, {
        create: (_a = options.create) !== null && _a !== void 0 ? _a : false,
    }), "file");
}
/**
 * Checks if the given path exists.
 *
 * This function may throw an error if the path is invalid or the operation is
 * not allowed.
 */
async function exists(path, options = {}) {
    try {
        await stat(path, options);
        return true;
    }
    catch (err) {
        if (err instanceof Exception) {
            if (err.name === "NotFoundError") {
                return false;
            }
        }
        throw err;
    }
}
/**
 * Returns the information of the given file or directory.
 */
async function stat(target, options = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
    if (typeof target === "object") {
        if (target.kind === "file") {
            const info = await rawOp(target.getFile(), "file");
            return {
                name: target.name,
                kind: "file",
                size: info.size,
                type: (_b = (_a = info.type) !== null && _a !== void 0 ? _a : getMIME(extname(target.name))) !== null && _b !== void 0 ? _b : "",
                mtime: new Date(info.lastModified),
                atime: null,
                birthtime: null,
                mode: 0,
                uid: 0,
                gid: 0,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        }
        else {
            return {
                name: target.name,
                kind: "directory",
                size: 0,
                type: "",
                mtime: null,
                atime: null,
                birthtime: null,
                mode: 0,
                uid: 0,
                gid: 0,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        }
    }
    const path = target;
    if (isDeno) {
        const stat = await rawOp(options.followSymlink ? Deno.stat(path) : Deno.lstat(path));
        const kind = stat.isDirectory
            ? "directory"
            : stat.isSymlink
                ? "symlink"
                : "file";
        return {
            name: basename(path),
            kind,
            size: stat.size,
            type: kind === "file" ? ((_c = getMIME(extname(path))) !== null && _c !== void 0 ? _c : "") : "",
            mtime: (_d = stat.mtime) !== null && _d !== void 0 ? _d : null,
            atime: (_e = stat.atime) !== null && _e !== void 0 ? _e : null,
            birthtime: (_f = stat.birthtime) !== null && _f !== void 0 ? _f : null,
            mode: (_g = stat.mode) !== null && _g !== void 0 ? _g : 0,
            uid: (_h = stat.uid) !== null && _h !== void 0 ? _h : 0,
            gid: (_j = stat.gid) !== null && _j !== void 0 ? _j : 0,
            isBlockDevice: (_k = stat.isBlockDevice) !== null && _k !== void 0 ? _k : false,
            isCharDevice: (_l = stat.isCharDevice) !== null && _l !== void 0 ? _l : false,
            isFIFO: (_m = stat.isFifo) !== null && _m !== void 0 ? _m : false,
            isSocket: (_o = stat.isSocket) !== null && _o !== void 0 ? _o : false,
        };
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        const stat = await rawOp(options.followSymlink ? fs.stat(path) : fs.lstat(path));
        const kind = stat.isDirectory()
            ? "directory"
            : stat.isSymbolicLink()
                ? "symlink"
                : "file";
        return {
            name: basename(path),
            kind,
            size: stat.size,
            type: kind === "file" ? ((_p = getMIME(extname(path))) !== null && _p !== void 0 ? _p : "") : "",
            mtime: (_q = stat.mtime) !== null && _q !== void 0 ? _q : null,
            atime: (_r = stat.atime) !== null && _r !== void 0 ? _r : null,
            birthtime: (_s = stat.birthtime) !== null && _s !== void 0 ? _s : null,
            mode: (_t = stat.mode) !== null && _t !== void 0 ? _t : 0,
            uid: (_u = stat.uid) !== null && _u !== void 0 ? _u : 0,
            gid: (_v = stat.gid) !== null && _v !== void 0 ? _v : 0,
            isBlockDevice: stat.isBlockDevice(),
            isCharDevice: stat.isCharacterDevice(),
            isFIFO: stat.isFIFO(),
            isSocket: stat.isSocket(),
        };
    }
    else {
        const [err, file] = await _try(getFileHandle(path, options));
        if (file) {
            const info = await rawOp(file.getFile(), "file");
            return {
                name: info.name,
                kind: "file",
                size: info.size,
                type: (_x = (_w = info.type) !== null && _w !== void 0 ? _w : getMIME(extname(info.name))) !== null && _x !== void 0 ? _x : "",
                mtime: new Date(info.lastModified),
                atime: null,
                birthtime: null,
                mode: 0,
                uid: 0,
                gid: 0,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        }
        else if (((_y = as(err, Exception)) === null || _y === void 0 ? void 0 : _y.name) === "IsDirectoryError") {
            return {
                name: basename(path),
                kind: "directory",
                size: 0,
                type: "",
                mtime: null,
                atime: null,
                birthtime: null,
                mode: 0,
                uid: 0,
                gid: 0,
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
}
/**
 * Creates a new directory with the given path.
 */
async function mkdir(path, options = {}) {
    if (isDeno) {
        await rawOp(Deno.mkdir(path, options));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await rawOp(fs.mkdir(path, options));
    }
    else {
        if (await exists(path, { root: options.root })) {
            throw new Exception(`File or folder already exists, mkdir '${path}'`, {
                name: "AlreadyExistsError",
                code: 409,
            });
        }
        await getDirHandle(path, { ...options, create: true });
    }
}
/**
 * Ensures the directory exists, creating it (and any parent directory) if not.
 */
async function ensureDir(path, options = {}) {
    var _a;
    if (await exists(path, options)) {
        return;
    }
    try {
        await mkdir(path, { ...options, recursive: true });
    }
    catch (err) {
        if (((_a = as(err, Exception)) === null || _a === void 0 ? void 0 : _a.name) === "AlreadyExistsError") {
            return;
        }
        else {
            throw err;
        }
    }
}
/**
 * Reads the directory of the given path and iterates its entries.
 *
 * NOTE: The order of the entries is not guaranteed.
 */
async function* readDir(target, options = {}) {
    if (typeof target === "object") {
        yield* readDirHandle(target, options);
        return;
    }
    const path = target;
    if (isDeno) {
        yield* (async function* read(path, base) {
            try {
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
            }
            catch (err) {
                throw wrapFsError(err);
            }
        })(path, "");
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        yield* (async function* read(path, base) {
            const entries = await rawOp(fs.readdir(path, { withFileTypes: true }));
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
    else {
        const dir = await getDirHandle(path, { root: options.root });
        yield* readDirHandle(dir, options);
    }
}
/**
 * Recursively reads the contents of the directory and transform them into a
 * tree structure.
 *
 * NOTE: Unlike {@link readDir}, the order of the entries returned by this
 * function is guaranteed, they are ordered first by kind (directories before
 * files), then by names alphabetically.
 */
async function readTree(target, options = {}) {
    var _a;
    const entries = (await readAsArray(readDir(target, { ...options, recursive: true })));
    const list = entries.map(entry => ({
        ...entry,
        paths: split(entry.path),
    }));
    const nodes = (function walk(list, store) {
        // Order the entries first by kind, then by names alphabetically.
        list = [
            ...orderBy(list.filter(e => e.kind === "directory"), e => e.name, "asc"),
            ...orderBy(list.filter(e => e.kind === "file"), e => e.name, "asc"),
        ];
        const nodes = [];
        for (const entry of list) {
            if (entry.kind === "file") {
                nodes.push({
                    name: entry.name,
                    kind: entry.kind,
                    path: entry.path,
                    handle: entry.handle,
                });
                continue;
            }
            const paths = entry.paths;
            const childEntries = store.filter(e => startsWith(e.paths, paths));
            const directChildren = childEntries
                .filter(e => e.paths.length === paths.length + 1);
            if (directChildren.length) {
                const indirectChildren = childEntries
                    .filter(e => !directChildren.includes(e));
                nodes.push({
                    name: entry.name,
                    kind: entry.kind,
                    path: entry.path,
                    handle: entry.handle,
                    children: walk(directChildren, indirectChildren),
                });
            }
            else {
                nodes.push({
                    name: entry.name,
                    kind: entry.kind,
                    path: entry.path,
                    handle: entry.handle,
                    children: [],
                });
            }
        }
        return nodes;
    })(list.filter(entry => entry.paths.length === 1), list.filter(entry => entry.paths.length > 1));
    return {
        name: typeof target === "object"
            ? (target.name || "(root)")
            : ((_a = options.root) === null || _a === void 0 ? void 0 : _a.name) || (target && basename(target) || "(root)"),
        kind: "directory",
        path: "",
        handle: typeof target === "object" ? target : options.root,
        children: nodes,
    };
}
async function* readDirHandle(dir, options = {}) {
    const { base = "", recursive = false } = options;
    const entries = dir.entries();
    for await (const [_, entry] of entries) {
        const _entry = {
            name: entry.name,
            kind: entry.kind,
            path: join(base, entry.name),
            handle: entry,
        };
        yield _entry;
        if (recursive && entry.kind === "directory") {
            yield* readDirHandle(entry, {
                base: _entry.path,
                recursive,
            });
        }
    }
}
async function readFileHandle(handle, options) {
    const file = await rawOp(handle.getFile(), "file");
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
 * Reads the content of the given file in bytes.
 */
async function readFile(target, options = {}) {
    if (typeof target === "object") {
        return await readFileHandle(target, options);
    }
    const filename = target;
    if (isDeno) {
        return await rawOp(Deno.readFile(filename, options));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        const buffer = await rawOp(fs.readFile(filename, options));
        return new Uint8Array(buffer.buffer, 0, buffer.byteLength);
    }
    else {
        const handle = await getFileHandle(filename, { root: options.root });
        return await readFileHandle(handle, options);
    }
}
/**
 * Reads the content of the given file as text.
 */
async function readFileAsText(target, options = {}) {
    if (typeof target === "object") {
        return text(await readFileHandle(target, options));
    }
    const filename = target;
    if (isDeno) {
        return await rawOp(Deno.readTextFile(filename, options));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        return await rawOp(fs.readFile(filename, {
            encoding: "utf-8",
            signal: options.signal,
        }));
    }
    else {
        return text(await readFile(filename, options));
    }
}
/**
 * Reads the file as a `File` object.
 */
async function readFileAsFile(target, options = {}) {
    var _a;
    if (typeof target === "object") {
        return await readFileHandleAsFile(target);
    }
    const filename = target;
    if (isDeno || isNodeLike) {
        const bytes = await readFile(filename, options);
        const type = (_a = getMIME(extname(filename))) !== null && _a !== void 0 ? _a : "";
        return new File([bytes], basename(filename), { type });
    }
    else {
        const handle = await getFileHandle(target, { root: options.root });
        return await readFileHandleAsFile(handle);
    }
}
async function readFileHandleAsFile(handle) {
    var _a;
    const file = await rawOp(handle.getFile(), "file");
    if (!file.type) {
        const ext = extname(file.name);
        if (ext) {
            Object.defineProperty(file, "type", {
                value: (_a = getMIME(ext)) !== null && _a !== void 0 ? _a : "",
                writable: false,
                configurable: true,
            });
        }
    }
    return file;
}
/**
 * Reads the file as a `ReadableStream`.
 */
function readFileAsStream(target, options = {}) {
    return resolveReadableStream((async () => {
        if (typeof target === "object") {
            return await readFileHandleAsStream(target);
        }
        const filename = target;
        if (isDeno) {
            const file = await rawOp(Deno.open(filename, { read: true }));
            return file.readable;
        }
        else if (isNodeLike) {
            const filename = target;
            const fs = await import('fs');
            const reader = fs.createReadStream(filename);
            return toReadableStream(reader);
        }
        else {
            const handle = await getFileHandle(filename, { root: options.root });
            return await readFileHandleAsStream(handle);
        }
    })());
}
async function readFileHandleAsStream(handle) {
    const file = await rawOp(handle.getFile(), "file");
    return file.stream();
}
/**
 * Writes the given data to the file.
 */
async function writeFile(target, data, options = {}) {
    if (typeof target === "object") {
        return await writeFileHandle(target, data, options);
    }
    const filename = target;
    if (isDeno) {
        if (typeof data === "string") {
            return await rawOp(Deno.writeTextFile(filename, data, options));
        }
        else if (data instanceof Blob) {
            return await rawOp(Deno.writeFile(filename, data.stream(), options));
        }
        else if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
            return await rawOp(Deno.writeFile(filename, new Uint8Array(data), options));
        }
        else {
            return await rawOp(Deno.writeFile(filename, data, options));
        }
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        const { append, ...rest } = options;
        let _data;
        if (typeof Blob === "function" && data instanceof Blob) {
            _data = new Uint8Array(await data.arrayBuffer());
        }
        else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
            _data = new Uint8Array(await readAsArrayBuffer(data));
        }
        else if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
            _data = new Uint8Array(data);
        }
        else if (typeof data === "string" || "buffer" in data) {
            _data = data;
        }
        else {
            throw new Error("Unsupported data type");
        }
        return await rawOp(fs.writeFile(filename, _data, {
            flag: (options === null || options === void 0 ? void 0 : options.append) ? "a" : "w",
            ...rest,
        }));
    }
    else {
        const handle = await getFileHandle(filename, { root: options.root, create: true });
        return await writeFileHandle(handle, data, options);
    }
}
async function writeFileHandle(handle, data, options) {
    var _a;
    const writer = await rawOp(handle.createWritable({
        keepExistingData: (_a = options === null || options === void 0 ? void 0 : options.append) !== null && _a !== void 0 ? _a : false,
    }), "file");
    if (options.append) {
        const file = await rawOp(handle.getFile(), "file");
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
    try {
        if (data instanceof Blob) {
            await data.stream().pipeTo(writer);
        }
        else if (data instanceof ReadableStream) {
            await data.pipeTo(writer);
        }
        else {
            await writer.write(data);
            await writer.close();
        }
    }
    catch (err) {
        throw wrapFsError(err, "file");
    }
}
/**
 * Writes multiple lines of content to the file.
 *
 * This function will automatically detect the line ending of the current
 * content and use it to write the new lines. If the file is empty or does not
 * exists (will be created automatically), it will use the system's default line
 * ending to separate lines.
 *
 * This function will append a new line at the end of the final content, in
 * appending mode, it will also prepend a line ending before the input lines if
 * the current content doesn't ends with one.
 */
async function writeLines(target, lines, options = {}) {
    const current = await readFileAsText(target, options).catch(err => {
        var _a;
        if (((_a = as(err, Exception)) === null || _a === void 0 ? void 0 : _a.name) !== "NotFoundError") {
            throw err;
        }
        else {
            return "";
        }
    });
    const lineEndings = current.match(/\r?\n/g);
    let eol = EOL;
    if (lineEndings) {
        const crlf = lineEndings.filter(e => e === "\r\n").length;
        const lf = lineEndings.length - crlf;
        eol = crlf > lf ? "\r\n" : "\n";
    }
    let content = lines.join(eol);
    if (!content.endsWith(eol)) {
        if (eol === "\r\n" && content.endsWith("\r")) {
            content += "\n";
        }
        else {
            content += eol;
        }
    }
    if (options.append && !current.endsWith(eol) && !content.startsWith(eol)) {
        if (eol === "\r\n" && current.endsWith("\r")) {
            if (!content.startsWith("\n")) {
                content = "\n" + content;
            }
        }
        else {
            content = eol + content;
        }
    }
    await writeFile(target, content, options);
}
/**
 * Truncates (or extends) the file to reach the specified `size`. If `size` is
 * not specified then the entire file contents are truncated.
 */
async function truncate(target, size = 0, options = {}) {
    if (typeof target === "object") {
        return await truncateFileHandle(target, size);
    }
    const filename = target;
    if (isDeno) {
        await rawOp(Deno.truncate(filename, size));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await rawOp(fs.truncate(filename, size));
    }
    else {
        const handle = await getFileHandle(filename, { root: options.root });
        await truncateFileHandle(handle, size);
    }
}
async function truncateFileHandle(handle, size = 0) {
    try {
        const writer = await handle.createWritable({ keepExistingData: true });
        await writer.truncate(size);
        await writer.close();
    }
    catch (err) {
        throw wrapFsError(err, "file");
    }
}
/**
 * Removes the file or directory of the given path from the file system.
 */
async function remove(path, options = {}) {
    if (isDeno) {
        await rawOp(Deno.remove(path, options));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        if (typeof fs.rm === "function") {
            await rawOp(fs.rm(path, options));
        }
        else {
            try {
                const _stat = await fs.stat(path);
                if (_stat.isDirectory()) {
                    await fs.rmdir(path, options);
                }
                else {
                    await fs.unlink(path);
                }
            }
            catch (err) {
                throw wrapFsError(err);
            }
        }
    }
    else {
        const parent = dirname(path);
        const name = basename(path);
        const dir = await getDirHandle(parent, { root: options.root });
        await rawOp(dir.removeEntry(name, options), "directory");
    }
}
/**
 * Renames the file or directory from the old path to the new path.
 */
async function rename(oldPath, newPath, options = {}) {
    if (isDeno) {
        await rawOp(Deno.rename(oldPath, newPath));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await rawOp(fs.rename(oldPath, newPath));
    }
    else {
        return await copyInBrowser(oldPath, newPath, {
            root: options.root,
            recursive: true,
            move: true,
        });
    }
}
async function copy(src, dest, options = {}) {
    var _a, _b;
    if (typeof src === "object" || typeof dest === "object") {
        return copyInBrowser(src, dest, { recursive: (_a = options === null || options === void 0 ? void 0 : options.recursive) !== null && _a !== void 0 ? _a : false });
    }
    if (isDeno || isNodeLike) {
        const oldStat = await stat(src, { followSymlink: true });
        const isDirSrc = oldStat.kind === "directory";
        let isDirDest = false;
        if (isDirSrc && !options.recursive) {
            throw new Exception("Cannot copy a directory without the 'recursive' option", {
                name: "InvalidOperationError",
                code: 400,
            });
        }
        try {
            const newStat = await stat(dest, { followSymlink: true });
            isDirDest = newStat.kind === "directory";
            if (isDirSrc && !isDirDest) {
                throw new Exception(`'${dest}' is not a directory`, {
                    name: "NotDirectoryError",
                    code: 415,
                });
            }
        }
        catch (_c) {
            if (isDirSrc) {
                await mkdir(dest);
                isDirDest = true;
            }
        }
        if (isDeno) {
            if (isDirSrc) {
                const entries = readDir(src, { recursive: true });
                for await (const entry of entries) {
                    const _oldPath = join(src, entry.path);
                    const _newPath = join(dest, entry.path);
                    if (entry.kind === "directory") {
                        await rawOp(Deno.mkdir(_newPath));
                    }
                    else {
                        await rawOp(Deno.copyFile(_oldPath, _newPath));
                    }
                }
            }
            else {
                const _newPath = isDirDest ? join(dest, basename(src)) : dest;
                await rawOp(Deno.copyFile(src, _newPath));
            }
        }
        else {
            const fs = await import('fs/promises');
            if (isDirSrc) {
                const entries = readDir(src, { recursive: true });
                for await (const entry of entries) {
                    const _oldPath = join(src, entry.path);
                    const _newPath = join(dest, entry.path);
                    if (entry.kind === "directory") {
                        await rawOp(fs.mkdir(_newPath));
                    }
                    else {
                        await rawOp(fs.copyFile(_oldPath, _newPath));
                    }
                }
            }
            else {
                const _newPath = isDirDest ? join(dest, basename(src)) : dest;
                await rawOp(fs.copyFile(src, _newPath));
            }
        }
    }
    else {
        return await copyInBrowser(src, dest, {
            root: options.root,
            recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
        });
    }
}
async function copyInBrowser(src, dest, options = {}) {
    var _a, _b;
    if (typeof src === "object" && typeof dest !== "object") {
        throw new TypeError("The destination must be a FileSystemHandle");
    }
    else if (typeof dest === "object" && typeof src !== "object") {
        throw new TypeError("The source must be a FileSystemHandle");
    }
    else if (typeof src === "object" && typeof dest === "object") {
        if (src.kind === "file") {
            if (dest.kind === "file") {
                return await copyFileHandleToFileHandle(src, dest);
            }
            else {
                return await copyFileHandleToDirHandle(src, dest);
            }
        }
        else if (dest.kind === "directory") {
            if (!options.recursive) {
                throw new Exception("Cannot copy a directory without the 'recursive' option", {
                    name: "InvalidOperationError",
                    code: 400,
                });
            }
            return await copyDirHandleToDirHandle(src, dest);
        }
        else {
            throw new Exception("The destination location is not a directory", {
                name: "NotDirectoryError",
                code: 415,
            });
        }
    }
    const oldParent = dirname(src);
    const oldName = basename(src);
    let oldDir = await getDirHandle(oldParent, { root: options.root });
    const [oldErr, oldFile] = await _try(rawOp(oldDir.getFileHandle(oldName), "file"));
    if (oldFile) {
        const newParent = dirname(dest);
        const newName = basename(dest);
        let newDir = await getDirHandle(newParent, { root: options.root });
        const [newErr, newFile] = await _try(rawOp(newDir.getFileHandle(newName, {
            create: true,
        }), "file"));
        if (newFile) {
            await copyFileHandleToFileHandle(oldFile, newFile);
            if (options.move) {
                await rawOp(oldDir.removeEntry(oldName), "directory");
            }
        }
        else if (((_a = as(newErr, Exception)) === null || _a === void 0 ? void 0 : _a.name) === "IsDirectoryError" && !options.move) {
            // The destination is a directory, copy the file into the new path
            // with the old name.
            newDir = await rawOp(newDir.getDirectoryHandle(newName), "directory");
            await copyFileHandleToDirHandle(oldFile, newDir);
        }
        else {
            throw newErr;
        }
    }
    else if (((_b = as(oldErr, Exception)) === null || _b === void 0 ? void 0 : _b.name) === "IsDirectoryError") {
        if (!options.recursive) {
            throw new Exception("Cannot copy a directory without the 'recursive' option", {
                name: "InvalidOperationError",
                code: 400,
            });
        }
        const parent = oldDir;
        oldDir = await rawOp(oldDir.getDirectoryHandle(oldName), "directory");
        const newDir = await getDirHandle(dest, { root: options.root, create: true });
        await copyDirHandleToDirHandle(oldDir, newDir);
        if (options.move) {
            await rawOp(parent.removeEntry(oldName, { recursive: true }), "directory");
        }
    }
    else {
        throw oldErr;
    }
}
async function copyFileHandleToFileHandle(src, dest) {
    try {
        const srcFile = await src.getFile();
        const destFile = await dest.createWritable();
        await srcFile.stream().pipeTo(destFile);
    }
    catch (err) {
        throw wrapFsError(err, "file");
    }
}
async function copyFileHandleToDirHandle(src, dest) {
    try {
        const srcFile = await src.getFile();
        const newFile = await dest.getFileHandle(src.name, { create: true });
        const destFile = await newFile.createWritable();
        await srcFile.stream().pipeTo(destFile);
    }
    catch (err) {
        throw wrapFsError(err, "file");
    }
}
async function copyDirHandleToDirHandle(src, dest) {
    const entries = src.entries();
    for await (const [_, entry] of entries) {
        if (entry.kind === "file") {
            try {
                const oldFile = await entry.getFile();
                const newFile = await dest.getFileHandle(entry.name, {
                    create: true,
                });
                const reader = oldFile.stream();
                const writer = await newFile.createWritable();
                await reader.pipeTo(writer);
            }
            catch (err) {
                throw wrapFsError(err, "file");
            }
        }
        else {
            const newSubDir = await rawOp(dest.getDirectoryHandle(entry.name, {
                create: true,
            }), "directory");
            await copyDirHandleToDirHandle(entry, newSubDir);
        }
    }
}
/**
 * Creates a hard link (or symbolic link) from the source path to the destination
 * path.
 *
 * NOTE: This function is not available in the browser.
 */
async function link(src, dest, options = {}) {
    if (isDeno) {
        if (options.symbolic) {
            if (platform() === "windows") {
                const _stat = await stat(src);
                await rawOp(Deno.symlink(src, dest, {
                    type: _stat.kind === "directory" ? "dir" : "file",
                }));
            }
            else {
                await rawOp(Deno.symlink(src, dest));
            }
        }
        else {
            await rawOp(Deno.link(src, dest));
        }
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        if (options.symbolic) {
            if (platform() === "windows") {
                const _stat = await stat(src);
                await rawOp(fs.symlink(src, dest, _stat.kind === "directory" ? "dir" : "file"));
            }
            else {
                await rawOp(fs.symlink(src, dest));
            }
        }
        else {
            await rawOp(fs.link(src, dest));
        }
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Returns the destination path of a symbolic link.
 *
 * NOTE: This function is not available in the browser.
 */
async function readLink(path) {
    if (isDeno) {
        return await rawOp(Deno.readLink(path));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        return await rawOp(fs.readlink(path));
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Changes the permission of the specified file or directory.
 *
 * The mode is a sequence of 3 octal numbers. The first/left-most number
 * specifies the permissions for the owner. The second number specifies the
 * permissions for the group. The last/right-most number specifies the
 * permissions for others. For example, with a mode of 0o764, the owner (7) can
 * read/write/execute, the group (6) can read/write and everyone else (4) can
 * read only.
 *
 * | Number | Description |
 * | ------ | ----------- |
 * | 7      | read, write, and execute |
 * | 6      | read and write |
 * | 5      | read and execute |
 * | 4      | read only |
 * | 3      | write and execute |
 * | 2      | write only |
 * | 1      | execute only |
 * | 0      | no permission |
 *
 * NOTE: This function is not available in Windows and the browser.
 */
async function chmod(path, mode) {
    if (platform() !== "windows") {
        if (isDeno) {
            await rawOp(Deno.chmod(path, mode));
        }
        else if (isNodeLike) {
            const fs = await import('fs/promises');
            await rawOp(fs.chmod(path, mode));
        }
        else {
            throw new Error("Unsupported runtime");
        }
    }
    else {
        throw new Error("Unsupported platform");
    }
}
/**
 * Changes the owner and group of the specified file or directory.
 *
 * NOTE: This function is not available in Windows and the browser.
 */
async function chown(path, uid, gid) {
    if (platform() !== "windows") {
        if (isDeno) {
            await rawOp(Deno.chown(path, uid, gid));
        }
        else if (isNodeLike) {
            const fs = await import('fs/promises');
            await rawOp(fs.chown(path, uid, gid));
        }
        else {
            throw new Error("Unsupported runtime");
        }
    }
    else {
        throw new Error("Unsupported platform");
    }
}
/**
 * Changes the access (`atime`) and modification (`mtime`) times of the file
 * or directory. Given times are either in seconds (UNIX epoch time) or as `Date`
 * objects.
 *
 * NOTE: This function is not available in the browser.
 */
async function utimes(path, atime, mtime) {
    if (isDeno) {
        await rawOp(Deno.utime(path, atime, mtime));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await rawOp(fs.utimes(path, atime, mtime));
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { EOL, chmod, chown, copy, ensureDir, exists, getDirHandle, getFileHandle, link, mkdir, readDir, readFile, readFileAsFile, readFileAsStream, readFileAsText, readLink, readTree, remove, rename, stat, truncate, utimes, writeFile, writeLines };
//# sourceMappingURL=fs.js.map
