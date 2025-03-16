import { throwUnsupportedRuntimeError } from '../error.js';
import { getMIME } from '../filetype.js';
import { makeTree } from '../fs/util.js';
import { join, basename, extname } from '../path.js';
import { readAsArray, readAsArrayBuffer } from '../reader.js';
export { BusyError, FileTooLargeError, FilesystemLoopError, InterruptedError, InvalidOperationError, IsDirectoryError, NotDirectoryError } from '../fs/errors.js';
import { isFileUrl } from '../path/util.js';
import { NotFoundError } from '../error/common.js';

const EOL = "\n";
async function getDirHandle(path, options = {}) {
    throwUnsupportedRuntimeError();
}
async function getFileHandle(path, options = {}) {
    throwUnsupportedRuntimeError();
}
function ensureFsTarget(path) {
    if (path instanceof URL || (typeof path === "string" && isFileUrl(path))) {
        throw new NotSupportedError("File URL is not supported in this runtime.");
    }
    else {
        return path;
    }
}
function getKVStore(options) {
    var _a;
    // @ts-ignore
    const kv = ((_a = options.root) !== null && _a !== void 0 ? _a : globalThis["__STATIC_CONTENT"]);
    if (!kv) {
        throw new TypeError("Must set the `options.root` a KVNamespace object.");
    }
    return kv;
}
// @ts-ignore
const loadManifest = (async () => {
    // @ts-ignore
    if (globalThis["__STATIC_CONTENT_MANIFEST"]) {
        // @ts-ignore
        return globalThis["__STATIC_CONTENT_MANIFEST"];
    }
    // @ts-ignore
    return import('__STATIC_CONTENT_MANIFEST')
        .then((mod) => JSON.parse(mod.default))
        .catch(() => ({}));
})();
function throwNotFoundError(filename, kind = "file") {
    throw new NotFoundError(`${kind === "file" ? "File" : "Directory"} '${filename}' does not exist`);
}
async function exists(path, options = {}) {
    void getKVStore(options);
    path = ensureFsTarget(path);
    path = join(path);
    const manifest = await loadManifest;
    const filenames = Object.keys(manifest);
    if (filenames.includes(path)) {
        return true;
    }
    else {
        const dirPath = path + "/";
        return filenames.some(filename => filename.startsWith(dirPath));
    }
}
async function stat(target, options = {}) {
    var _a;
    target = ensureFsTarget(target);
    const filename = join(target);
    const kv = getKVStore(options);
    const manifest = await loadManifest;
    const filenames = Object.keys(manifest);
    if (filenames.includes(filename)) {
        const buffer = await kv.get(filename, { type: "arrayBuffer" });
        return {
            name: basename(filename),
            kind: "file",
            size: buffer.byteLength,
            type: (_a = getMIME(extname(filename))) !== null && _a !== void 0 ? _a : "",
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
        const dirPath = filename + "/";
        if (filenames.some(filename => filename.startsWith(dirPath))) {
            return {
                name: basename(filename),
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
            throwNotFoundError(filename);
        }
    }
}
async function mkdir(path, options = {}) {
    throwUnsupportedRuntimeError();
}
async function ensureDir(path, options = {}) {
    throwUnsupportedRuntimeError();
}
async function* readDir(target, options = {}) {
    void getKVStore(options);
    const manifest = await loadManifest;
    const StaticFilenames = Object.keys(manifest);
    target = ensureFsTarget(target);
    let dirPath = target;
    if (dirPath === "." || dirPath.endsWith("/")) {
        dirPath = dirPath.slice(0, -1);
    }
    let dirPaths = new Set();
    let hasFiles = false;
    if (options.recursive) {
        const prefix = dirPath ? dirPath + "/" : "";
        const _filenames = prefix
            ? StaticFilenames.filter(filename => filename.startsWith(prefix))
            : StaticFilenames;
        if (!_filenames.length) {
            throwNotFoundError(dirPath, "directory");
        }
        for (let relativePath of _filenames) {
            relativePath = relativePath.slice(prefix.length);
            const parts = relativePath.split("/");
            if (parts.length >= 2) { // direct folder
                const dirPath = parts.slice(0, -1).join("/");
                if (!dirPaths.has(dirPath)) {
                    dirPaths.add(dirPath);
                    hasFiles = true;
                    yield {
                        name: parts.slice(-2, -1)[0],
                        kind: "directory",
                        relativePath: dirPath,
                    };
                }
                yield {
                    name: parts[0],
                    kind: "file",
                    relativePath,
                };
            }
            else if (parts.length === 1) { // direct file
                hasFiles = true;
                yield {
                    name: parts[0],
                    kind: "file",
                    relativePath,
                };
            }
        }
        if (!hasFiles) {
            throwNotFoundError(dirPath, "directory");
        }
    }
    else {
        const allEntries = await readAsArray(readDir(target, { ...options, recursive: true }));
        for (const entry of allEntries) {
            if (!entry.relativePath.includes("/")) {
                yield entry;
            }
        }
    }
}
async function readTree(target, options = {}) {
    target = ensureFsTarget(target);
    const entries = (await readAsArray(readDir(target, { ...options, recursive: true })));
    return makeTree(target, entries, true);
}
async function readFile(target, options = {}) {
    target = ensureFsTarget(target);
    const filename = target;
    const kv = getKVStore(options);
    const stream = await kv.get(filename, { type: "stream" });
    if (!stream) {
        throwNotFoundError(filename);
    }
    const ctrl = new AbortController();
    ctrl.signal.addEventListener("abort", () => stream.cancel());
    const buffer = await readAsArrayBuffer(stream);
    return new Uint8Array(buffer);
}
async function readFileAsText(target, options = {}) {
    target = ensureFsTarget(target);
    const filename = target;
    const kv = getKVStore(options);
    const text = await kv.get(filename, { type: "text" });
    if (text === null) {
        throwNotFoundError(filename);
    }
    else {
        return text;
    }
}
async function readFileAsFile(target, options = {}) {
    var _a;
    target = ensureFsTarget(target);
    const filename = target;
    const kv = getKVStore(options);
    const buffer = await kv.get(filename, { type: "arrayBuffer" });
    if (!buffer) {
        throwNotFoundError(filename);
    }
    const file = new File([buffer], filename, {
        type: (_a = getMIME(extname(filename))) !== null && _a !== void 0 ? _a : "",
    });
    Object.defineProperty(file, "webkitRelativePath", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: "",
    });
    return file;
}
async function writeFile(target, data, options = {}) {
    throwUnsupportedRuntimeError();
}
async function writeLines(target, lines, options = {}) {
    throwUnsupportedRuntimeError();
}
async function truncate(target, size = 0, options = {}) {
    throwUnsupportedRuntimeError();
}
async function remove(path, options = {}) {
    throwUnsupportedRuntimeError();
}
async function rename(oldPath, newPath, options = {}) {
    throwUnsupportedRuntimeError();
}
async function copy(src, dest, options = {}) {
    throwUnsupportedRuntimeError();
}
async function link(src, dest, options = {}) {
    throwUnsupportedRuntimeError();
}
async function readLink(path) {
    throwUnsupportedRuntimeError();
}
async function chmod(path, mode) {
}
async function chown(path, uid, gid) {
}
async function utimes(path, atime, mtime) {
}
function createReadableStream(target, options = {}) {
    throwUnsupportedRuntimeError();
}
function createWritableStream(target, options = {}) {
    throwUnsupportedRuntimeError();
}

export { EOL, chmod, chown, copy, createReadableStream, createWritableStream, ensureDir, exists, getDirHandle, getFileHandle, link, mkdir, readDir, readFile, readFileAsFile, readFileAsText, readLink, readTree, remove, rename, stat, truncate, utimes, writeFile, writeLines };
//# sourceMappingURL=fs.js.map
