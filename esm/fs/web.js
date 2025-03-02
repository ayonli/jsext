import { abortable } from '../async.js';
import { getMIME } from '../filetype.js';
import { as } from '../object.js';
import { dirname, basename, extname, join } from '../path.js';
import { readAsArray, readAsText } from '../reader.js';
import { stripStart } from '../string.js';
import { try_ } from '../result.js';
import { rawOp, fixDirEntry, makeTree, fixFileType, wrapFsError } from './util.js';
import { split } from '../path/util.js';
import { toAsyncIterable, resolveByteStream } from '../reader/util.js';

/**
 * A slim version of the `fs` module for the browser.
 *
 * Normally, we should just use the `fs` module, however, if we don't want
 * to include other parts that are not needed in the browser, we can use this
 * module instead.
 * @module
 */
const EOL = "\n";
/**
 * Obtains the directory handle of the given path.
 *
 * NOTE: This function is only available in the browser.
 *
 * NOTE: If the `path` is not provided or is empty, the root directory handle
 * will be returned.
 *
 * @example
 * ```ts
 * // with the default storage
 * import { getDirHandle } from "@ayonli/jsext/fs";
 *
 * const dir = await getDirHandle("/path/to/dir");
 * ```
 *
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { getDirHandle } from "@ayonli/jsext/fs";
 *
 * const root = await window.showDirectoryPicker();
 * const dir = await getDirHandle("/path/to/dir", { root });
 * ```
 *
 * @example
 * ```ts
 * // create the directory if not exist
 * import { getDirHandle } from "@ayonli/jsext/fs";
 *
 * const dir = await getDirHandle("/path/to/dir", { create: true, recursive: true });
 * ```
 *
 * @example
 * ```ts
 * // return the root directory handle
 * import { getDirHandle } from "@ayonli/jsext/fs";
 *
 * const root = await getDirHandle();
 * ```
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
 *
 * @example
 * ```ts
 * // with the default storage
 * import { getFileHandle } from "@ayonli/jsext/fs";
 *
 * const file = await getFileHandle("/path/to/file.txt");
 * ```
 *
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { getFileHandle } from "@ayonli/jsext/fs";
 *
 * const root = await window.showDirectoryPicker();
 * const file = await getFileHandle("/path/to/file.txt", { root });
 * ```
 *
 * @example
 * ```ts
 * // create the file if not exist
 * import { getFileHandle } from "@ayonli/jsext/fs";
 *
 * const file = await getFileHandle("/path/to/file.txt", { create: true });
 * ```
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
async function stat(target, options = {}) {
    var _a, _b, _c, _d, _e;
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
    else {
        const { value: file, error: err, } = await try_(getFileHandle(target, options));
        if (file) {
            const info = await rawOp(file.getFile(), "file");
            return {
                name: info.name,
                kind: "file",
                size: info.size,
                type: (_d = (_c = info.type) !== null && _c !== void 0 ? _c : getMIME(extname(info.name))) !== null && _d !== void 0 ? _d : "",
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
        else if (((_e = as(err, Exception)) === null || _e === void 0 ? void 0 : _e.name) === "IsDirectoryError") {
            return {
                name: basename(target),
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
async function mkdir(path, options = {}) {
    if (await exists(path, { root: options.root })) {
        throw new Exception(`File or folder already exists, mkdir '${path}'`, {
            name: "AlreadyExistsError",
            code: 409,
        });
    }
    await getDirHandle(path, { ...options, create: true });
}
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
async function* readDir(target, options = {}) {
    const handle = typeof target === "object"
        ? target
        : await getDirHandle(target, options);
    yield* readDirHandle(handle, options);
}
async function* readDirHandle(dir, options = {}) {
    const { base = "", recursive = false } = options;
    const entries = dir.entries();
    for await (const [_, entry] of entries) {
        const _entry = fixDirEntry({
            name: entry.name,
            kind: entry.kind,
            relativePath: join(base, entry.name),
            handle: entry,
        });
        yield _entry;
        if (recursive && entry.kind === "directory") {
            yield* readDirHandle(entry, {
                base: _entry.relativePath,
                recursive,
            });
        }
    }
}
async function readTree(target, options = {}) {
    const entries = (await readAsArray(readDir(target, { ...options, recursive: true })));
    const tree = makeTree(target, entries, true);
    if (!tree.handle && options.root) {
        tree.handle = options.root;
    }
    return tree;
}
async function readFile(target, options = {}) {
    const handle = typeof target === "object"
        ? target
        : await getFileHandle(target, { root: options.root });
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
async function readFileAsText(target, options = {}) {
    const { encoding, ...rest } = options;
    const file = await readFile(target, rest);
    return await readAsText(file, encoding);
}
async function readFileAsFile(target, options = {}) {
    const handle = typeof target === "object"
        ? target
        : await getFileHandle(target, { root: options.root });
    const file = await rawOp(handle.getFile(), "file");
    return fixFileType(file);
}
async function writeFile(target, data, options = {}) {
    const handle = typeof target === "object"
        ? target
        : await getFileHandle(target, { root: options.root, create: true });
    const writer = await createFileHandleWritableStream(handle, options);
    if (options.signal) {
        const { signal } = options;
        if (signal.aborted) {
            await writer.abort(signal.reason);
            throw wrapFsError(signal.reason, "file");
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
async function truncate(target, size = 0, options = {}) {
    const handle = typeof target === "object"
        ? target
        : await getFileHandle(target, { root: options.root });
    try {
        const writer = await handle.createWritable({ keepExistingData: true });
        await writer.truncate(size);
        await writer.close();
    }
    catch (err) {
        throw wrapFsError(err, "file");
    }
}
async function remove(path, options = {}) {
    const parent = dirname(path);
    const name = basename(path);
    const dir = await getDirHandle(parent, { root: options.root });
    await rawOp(dir.removeEntry(name, options), "directory");
}
async function rename(oldPath, newPath, options = {}) {
    return await copyInBrowser(oldPath, newPath, {
        root: options.root,
        recursive: true,
        move: true,
    });
}
async function copy(src, dest, options = {}) {
    return copyInBrowser(src, dest, options);
}
async function copyInBrowser(src, dest, options = {}) {
    var _a, _b;
    if (typeof src === "object" && typeof dest !== "object") {
        throw new TypeError("The destination must be a FileSystemHandle.");
    }
    else if (typeof dest === "object" && typeof src !== "object") {
        throw new TypeError("The source must be a FileSystemHandle.");
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
    const { value: oldFile, error: oldErr, } = await try_(rawOp(oldDir.getFileHandle(oldName), "file"));
    if (oldFile) {
        const newParent = dirname(dest);
        const newName = basename(dest);
        let newDir = await getDirHandle(newParent, { root: options.root });
        const { error: newErr, value: newFile, } = await try_(rawOp(newDir.getFileHandle(newName, {
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
function createReadableStream(target, options = {}) {
    return resolveByteStream((async () => {
        const handle = typeof target === "object"
            ? target
            : await getFileHandle(target, { root: options.root });
        const file = await rawOp(handle.getFile(), "file");
        return file.stream();
    })());
}
function createWritableStream(target, options = {}) {
    const { readable, writable } = new TransformStream();
    const getHandle = typeof target === "object"
        ? Promise.resolve(target)
        : getFileHandle(target, { root: options.root, create: true });
    getHandle.then(handle => createFileHandleWritableStream(handle, options))
        .then(stream => readable.pipeTo(stream));
    return writable;
}
async function createFileHandleWritableStream(handle, options) {
    var _a;
    const stream = await rawOp(handle.createWritable({
        keepExistingData: (_a = options === null || options === void 0 ? void 0 : options.append) !== null && _a !== void 0 ? _a : false,
    }), "file");
    if (options.append) {
        const file = await rawOp(handle.getFile(), "file");
        file.size && stream.seek(file.size);
    }
    return stream;
}

export { EOL, copy, createReadableStream, createWritableStream, ensureDir, exists, getDirHandle, getFileHandle, mkdir, readDir, readFile, readFileAsFile, readFileAsText, readTree, remove, rename, stat, truncate, writeFile, writeLines };
//# sourceMappingURL=web.js.map
