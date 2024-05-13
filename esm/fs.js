import { abortable } from './async.js';
import { text } from './bytes.js';
import { isDeno, isNodeLike, isBrowserWindow, isDedicatedWorker, isSharedWorker } from './env.js';
import { as } from './object.js';
import Exception from './error/Exception.js';
import { getMIME } from './filetype.js';
import { extname, basename, dirname, join } from './path.js';
import { readAsArrayBuffer } from './reader.js';
import { platform } from './runtime.js';
import _try from './try.js';
import { split } from './path/util.js';
import { toAsyncIterable } from './reader/util.js';

/**
 * Universal file system APIs for both server and browser applications.
 *
 * In most browsers, this module uses the Origin Private File System.
 * In Chromium browsers, this module can also access the device's local file
 * system via `window.showOpenFilePicker()` and `window.showDirectoryPicker()`.
 *
 * The module is experimental and may not work in some browsers.
 *
 * **Errors:**
 *
 * When a file system operation fails, the module throws an `Exception` object
 * with the following names:
 *
 * - `NotFoundError`: The file or directory does not exist.
 * - `NotAllowedError`: The operation is not allowed, such as blocked by the
 *   permission system.
 * - `AlreadyExistsError`: The file or directory already exists.
 * - `IsDirectoryError`: The path is a directory, not a file.
 * - `NotDirectoryError`: The path is a file, not a directory.
 * - `InvalidOperationError`: The operation is not supported, such as trying to
 *   copy a directory to a file.
 * - `BusyError`: The file is busy, such as being locked by another program.
 * - `InterruptedError`: The operation is interrupted by the underlying file
 *   system.
 * - `FileTooLargeError`: The file is too large, or the file system doesn't have
 *   enough space to store the new content.
 * - `FilesystemLoopError`:  Too many symbolic links were encountered when
 *   resolving the filename.
 *
 * Other errors may be thrown by the runtime, such as `TypeError`.
 * @experimental
 * @module
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
            console.log(err.name);
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
async function getDirHandle(path, options = {}) {
    var _a;
    if (typeof location === "object" && typeof location.origin === "string") {
        path = path.stripStart(location.origin);
    }
    const { create = false, recursive = false } = options;
    const paths = split(path.stripStart("/")).filter(p => p !== ".");
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
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
            isBlockDevice: (_g = stat.isBlockDevice) !== null && _g !== void 0 ? _g : false,
            isCharDevice: (_h = stat.isCharDevice) !== null && _h !== void 0 ? _h : false,
            isFIFO: (_j = stat.isFifo) !== null && _j !== void 0 ? _j : false,
            isSocket: (_k = stat.isSocket) !== null && _k !== void 0 ? _k : false,
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
            type: kind === "file" ? ((_l = getMIME(extname(path))) !== null && _l !== void 0 ? _l : "") : "",
            mtime: (_m = stat.mtime) !== null && _m !== void 0 ? _m : null,
            atime: (_o = stat.atime) !== null && _o !== void 0 ? _o : null,
            birthtime: (_p = stat.birthtime) !== null && _p !== void 0 ? _p : null,
            isBlockDevice: stat.isBlockDevice(),
            isCharDevice: stat.isCharacterDevice(),
            isFIFO: stat.isFIFO(),
            isSocket: stat.isSocket(),
        };
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const parent = dirname(path);
        const name = basename(path);
        const dir = await getDirHandle(parent, options);
        const [err, file] = await _try(rawOp(dir.getFileHandle(name), "file"));
        if (file) {
            const info = await rawOp(file.getFile(), "file");
            return {
                name,
                kind: "file",
                size: info.size,
                type: (_r = (_q = info.type) !== null && _q !== void 0 ? _q : getMIME(extname(name))) !== null && _r !== void 0 ? _r : "",
                mtime: new Date(info.lastModified),
                atime: null,
                birthtime: null,
                isBlockDevice: false,
                isCharDevice: false,
                isFIFO: false,
                isSocket: false,
            };
        }
        else if (((_s = as(err, Exception)) === null || _s === void 0 ? void 0 : _s.name) === "IsDirectoryError") {
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
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        if (await exists(path, { root: options.root })) {
            throw new Exception(`File or folder already exists, mkdir '${path}'`, {
                name: "AlreadyExistsError",
                code: 409,
            });
        }
        await getDirHandle(path, { ...options, create: true });
    }
    else {
        throw new Error("Unsupported runtime");
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
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const dir = await getDirHandle(path, { root: options.root });
        yield* readDirHandle(dir, options);
    }
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
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const path = dirname(filename);
        const name = basename(filename);
        const dir = await getDirHandle(path, { root: options.root });
        const handle = await rawOp(dir.getFileHandle(name), "file");
        return await readFileHandle(handle, options);
    }
    else {
        throw new Error("Unsupported runtime");
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
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const path = dirname(filename);
        const name = basename(filename);
        const dir = await getDirHandle(path, { root: options.root });
        const handle = await rawOp(dir.getFileHandle(name, { create: true }), "file");
        return await writeFileHandle(handle, data, options);
    }
    else {
        throw new Error("Unsupported runtime");
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
 * Truncates (or extends) the specified file, to reach the specified `size`.
 * If `size` is not specified then the entire file contents are truncated.
 */
async function truncate(target, size = 0, options = {}) {
    if (typeof target === "object") {
        try {
            const writer = await target.createWritable({ keepExistingData: true });
            await writer.truncate(size);
            await writer.close();
            return;
        }
        catch (err) {
            throw wrapFsError(err, "file");
        }
    }
    const filename = target;
    if (isDeno) {
        await rawOp(Deno.truncate(filename, size));
    }
    else if (isNodeLike) {
        const fs = await import('fs/promises');
        await rawOp(fs.truncate(filename, size));
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const path = dirname(filename);
        const name = basename(filename);
        const dir = await getDirHandle(path, { root: options.root });
        try {
            const handle = await dir.getFileHandle(name);
            const writer = await handle.createWritable({ keepExistingData: true });
            await writer.truncate(size);
            await writer.close();
        }
        catch (err) {
            throw wrapFsError(err, "file");
        }
    }
    else {
        throw new Error("Unsupported runtime");
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
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        const parent = dirname(path);
        const name = basename(path);
        const dir = await getDirHandle(parent, { root: options.root });
        await rawOp(dir.removeEntry(name, options), "directory");
    }
    else {
        throw new Error("Unsupported runtime");
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
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return await copyInBrowser(oldPath, newPath, {
            root: options.root,
            move: true,
        });
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Copies the file or directory (and its contents) from the old path to the new
 * path.
 *
 * NOTE: If the old path is a file and the new path is a directory, the file
 * will be copied into the new directory with the old name.
 *
 * NOTE: In Unix/Linux systems, when using the `cp` command with a path ending
 * in a slash, the command will copy the directory itself into the new path if
 * the new path already exists. This function does not have this behavior, it
 * does not distinguish between a path with a trailing slash and a path without
 * it. So when copying a directory, this function always copy its contents to
 * the new path, whether the new path already exists or not.
 */
async function copy(oldPath, newPath, options = {}) {
    if (isDeno || isNodeLike) {
        const oldStat = await stat(oldPath, { followSymlink: true });
        const isDirSrc = oldStat.kind === "directory";
        let isDirDest = false;
        try {
            const newStat = await stat(newPath, { followSymlink: true });
            isDirDest = newStat.kind === "directory";
            if (isDirSrc && !isDirDest) {
                throw new Error("Cannot copy a directory to a file");
            }
        }
        catch (_a) {
            if (isDirSrc) {
                await mkdir(newPath);
                isDirDest = true;
            }
        }
        if (isDeno) {
            if (isDirSrc) {
                const entries = readDir(oldPath, { recursive: true });
                for await (const entry of entries) {
                    const _oldPath = join(oldPath, entry.path);
                    const _newPath = join(newPath, entry.path);
                    if (entry.kind === "directory") {
                        await rawOp(Deno.mkdir(_newPath));
                    }
                    else {
                        await rawOp(Deno.copyFile(_oldPath, _newPath));
                    }
                }
            }
            else {
                const _newPath = isDirDest ? join(newPath, basename(oldPath)) : newPath;
                await rawOp(Deno.copyFile(oldPath, _newPath));
            }
        }
        else {
            const fs = await import('fs/promises');
            if (isDirSrc) {
                const entries = readDir(oldPath, { recursive: true });
                for await (const entry of entries) {
                    const _oldPath = join(oldPath, entry.path);
                    const _newPath = join(newPath, entry.path);
                    if (entry.kind === "directory") {
                        await rawOp(fs.mkdir(_newPath));
                    }
                    else {
                        await rawOp(fs.copyFile(_oldPath, _newPath));
                    }
                }
            }
            else {
                const _newPath = isDirDest ? join(newPath, basename(oldPath)) : newPath;
                await rawOp(fs.copyFile(oldPath, _newPath));
            }
        }
    }
    else if (isBrowserWindow || isDedicatedWorker || isSharedWorker) {
        return await copyInBrowser(oldPath, newPath, {
            root: options.root,
        });
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
async function copyInBrowser(oldPath, newPath, options = {}) {
    var _a, _b;
    const oldParent = dirname(oldPath);
    const oldName = basename(oldPath);
    let oldDir = await getDirHandle(oldParent, { root: options.root });
    const [oldErr, oldFile] = await _try(rawOp(oldDir.getFileHandle(oldName), "file"));
    if (oldFile) {
        const newParent = dirname(newPath);
        const newName = basename(newPath);
        let newDir = await getDirHandle(newParent, { root: options.root });
        const [newErr, newFile] = await _try(rawOp(newDir.getFileHandle(newName, {
            create: true,
        }), "file"));
        if (newFile) {
            try {
                const src = (await oldFile.getFile()).stream();
                const dest = await newFile.createWritable();
                await src.pipeTo(dest);
            }
            catch (err) {
                throw wrapFsError(err, "file");
            }
            if (options.move) {
                await rawOp(oldDir.removeEntry(oldName), "directory");
            }
        }
        else if (((_a = as(newErr, Exception)) === null || _a === void 0 ? void 0 : _a.name) === "IsDirectoryError" && !options.move) {
            // The destination is a directory, copy the file into the new path
            // with the old name.
            newDir = await rawOp(newDir.getDirectoryHandle(newName), "directory");
            try {
                const newFile = await newDir.getFileHandle(oldName, { create: true });
                const src = (await oldFile.getFile()).stream();
                const dest = await newFile.createWritable();
                await src.pipeTo(dest);
            }
            catch (err) {
                throw wrapFsError(err, "file");
            }
        }
        else {
            throw newErr;
        }
    }
    else if (((_b = as(oldErr, Exception)) === null || _b === void 0 ? void 0 : _b.name) === "IsDirectoryError") {
        const parent = oldDir;
        oldDir = await rawOp(oldDir.getDirectoryHandle(oldName), "directory");
        const newDir = await getDirHandle(newPath, { root: options.root, create: true });
        await (async function copyDir(oldDir, newDir) {
            const entries = oldDir.entries();
            for await (const [_, entry] of entries) {
                if (entry.kind === "file") {
                    try {
                        const oldFile = await entry.getFile();
                        const newFile = await newDir.getFileHandle(entry.name, {
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
                    const newSubDir = await rawOp(newDir.getDirectoryHandle(entry.name, {
                        create: true,
                    }), "directory");
                    await copyDir(entry, newSubDir);
                }
            }
        })(oldDir, newDir);
        if (options.move) {
            await rawOp(parent.removeEntry(oldName, { recursive: true }), "directory");
        }
    }
    else {
        throw oldErr;
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
 * Resolves to the path destination of the named symbolic link.
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

export { EOL, copy, ensureDir, exists, link, mkdir, readDir, readFile, readFileAsText, readLink, remove, rename, stat, truncate, writeFile };
//# sourceMappingURL=fs.js.map
