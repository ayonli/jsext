/**
 * A slim version of the `fs` module for the browser.
 * 
 * Normally, we should just use the `fs` module, however, if we don't want
 * to include other parts that are not needed in the browser, we can use this
 * module instead.
 * @module
 */
import { abortable } from "../async.ts";
import { getMIME } from "../filetype.ts";
import { as } from "../object.ts";
import { basename, dirname, extname, join, split } from "../path.ts";
import { readAsArray, readAsText, resolveByteStream, toAsyncIterable } from "../reader.ts";
import { stripStart } from "../string.ts";
import { try_ } from "../result.ts";
import type { BinarySource } from "../types.ts";
import { fixDirEntry, fixFileType, makeTree, rawOp, wrapFsError } from "./util.ts";
import type { FileInfo, FileSystemOptions, DirEntry, DirTree } from "./types.ts";
import type {
    CopyOptions,
    GetDirOptions,
    GetFileOptions,
    MkdirOptions,
    ReadDirOptions,
    ReadFileOptions,
    RemoveOptions,
    StatOptions,
    WriteFileOptions,
} from "../fs.ts";
import { AlreadyExistsError } from "../error.ts";
import { InvalidOperationError, NotDirectoryError } from "./errors.ts";

export type { FileSystemOptions, FileInfo, DirEntry, DirTree };

export const EOL: "\n" | "\r\n" = "\n";

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
export async function getDirHandle(
    path: string = "",
    options: GetDirOptions = {}
): Promise<FileSystemDirectoryHandle> {
    if (typeof location === "object" && typeof location.origin === "string") {
        path = stripStart(path, location.origin);
    }

    const { create = false, recursive = false } = options;
    const paths = split(stripStart(path, "/")).filter(p => p !== ".");
    const root = options.root ?? await rawOp(navigator.storage.getDirectory(), "directory");
    let dir = root as FileSystemDirectoryHandle;

    for (let i = 0; i < paths.length; i++) {
        const _path = paths[i]!;
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
export async function getFileHandle(
    path: string,
    options: GetFileOptions = {}
): Promise<FileSystemFileHandle> {
    const dirPath = dirname(path);
    const name = basename(path);
    const dir = await getDirHandle(dirPath, { root: options.root });
    return await rawOp(dir.getFileHandle(name, {
        create: options.create ?? false,
    }), "file");
}

export async function exists(path: string, options: FileSystemOptions = {}): Promise<boolean> {
    try {
        await stat(path, options);
        return true;
    } catch (err) {
        if (err instanceof Exception) {
            if (err.name === "NotFoundError") {
                return false;
            }
        }

        throw err;
    }
}

export async function stat(
    target: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: StatOptions = {}
): Promise<FileInfo> {
    if (typeof target === "object") {
        if (target.kind === "file") {
            const info = await rawOp(target.getFile(), "file");
            return {
                name: target.name,
                kind: "file",
                size: info.size,
                type: info.type ?? getMIME(extname(target.name)) ?? "",
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
        } else {
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
    } else {
        const {
            value: file,
            error: err,
        } = await try_(getFileHandle(target, options));

        if (file) {
            const info = await rawOp(file.getFile(), "file");
            return {
                name: info.name,
                kind: "file",
                size: info.size,
                type: info.type ?? getMIME(extname(info.name)) ?? "",
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
        } else if (as(err, Exception)?.name === "IsDirectoryError") {
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
        } else {
            throw err;
        }
    }
}

export async function mkdir(path: string, options: MkdirOptions = {}): Promise<void> {
    if (await exists(path, { root: options.root })) {
        throw new AlreadyExistsError(`File or folder already exists, mkdir '${path}'`);
    }

    await getDirHandle(path, { ...options, create: true });
}

export async function ensureDir(
    path: string,
    options: Omit<MkdirOptions, "recursive"> = {}
): Promise<void> {
    if (await exists(path, options)) {
        return;
    }

    try {
        await mkdir(path, { ...options, recursive: true });
    } catch (err) {
        if (as(err, Exception)?.name === "AlreadyExistsError") {
            return;
        } else {
            throw err;
        }
    }
}

export async function* readDir(
    target: string | FileSystemDirectoryHandle,
    options: ReadDirOptions = {}
): AsyncIterableIterator<DirEntry> {
    const handle = typeof target === "object"
        ? target
        : await getDirHandle(target, options);
    yield* readDirHandle(handle, options);
}

async function* readDirHandle(dir: FileSystemDirectoryHandle, options: {
    base?: string,
    recursive?: boolean;
} = {}): AsyncIterableIterator<DirEntry> {
    const { base = "", recursive = false } = options;
    const entries = dir.entries();

    for await (const [_, entry] of entries) {
        const _entry = fixDirEntry({
            name: entry.name,
            kind: entry.kind,
            relativePath: join(base, entry.name),
            handle: entry as FileSystemFileHandle | FileSystemDirectoryHandle,
        });

        yield _entry;

        if (recursive && entry.kind === "directory") {
            yield* readDirHandle(entry as FileSystemDirectoryHandle, {
                base: _entry.relativePath,
                recursive,
            });
        }
    }
}

export async function readTree(
    target: string | FileSystemDirectoryHandle,
    options: FileSystemOptions = {}
): Promise<DirTree> {
    const entries = (await readAsArray(readDir(target, { ...options, recursive: true })));
    const tree = makeTree<DirEntry, DirTree>(target, entries, true);

    if (!tree.handle && options.root) {
        tree.handle = options.root as FileSystemDirectoryHandle;
    }

    return tree;
}

export async function readFile(
    target: string | FileSystemFileHandle,
    options: ReadFileOptions = {}
): Promise<Uint8Array<ArrayBuffer>> {
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

export async function readFileAsText(
    target: string | FileSystemFileHandle,
    options: ReadFileOptions & { encoding?: string; } = {}
): Promise<string> {
    const { encoding, ...rest } = options;
    const file = await readFile(target, rest);
    return await readAsText(file, encoding);
}

export async function readFileAsFile(
    target: string | FileSystemFileHandle,
    options: ReadFileOptions = {}
): Promise<File> {
    const handle = typeof target === "object"
        ? target
        : await getFileHandle(target, { root: options.root });
    const file = await rawOp(handle.getFile(), "file");
    return fixFileType(file);
}

export async function writeFile(
    target: string | FileSystemFileHandle,
    data: string | BinarySource,
    options: WriteFileOptions = {}
): Promise<void> {
    const handle = typeof target === "object"
        ? target
        : await getFileHandle(target, { root: options.root, create: true });
    const writer = await createFileHandleWritableStream(handle, options);

    if (options.signal) {
        const { signal } = options;

        if (signal.aborted) {
            await writer.abort(signal.reason);
            throw wrapFsError(signal.reason, "file");
        } else {
            signal.addEventListener("abort", () => {
                writer.abort(signal.reason);
            });
        }
    }

    try {
        if (data instanceof Blob) {
            await data.stream().pipeTo(writer);
        } else if (data instanceof ReadableStream) {
            await data.pipeTo(writer);
        } else {
            await writer.write(data as BufferSource);
            await writer.close();
        }
    } catch (err) {
        throw wrapFsError(err, "file");
    }
}

export async function writeLines(
    target: string | FileSystemFileHandle,
    lines: string[],
    options: WriteFileOptions = {}
): Promise<void> {
    const current = await readFileAsText(target, options).catch(err => {
        if (as(err, Exception)?.name !== "NotFoundError") {
            throw err;
        } else {
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
        } else {
            content += eol;
        }
    }

    if (options.append && !current.endsWith(eol) && !content.startsWith(eol)) {
        if (eol === "\r\n" && current.endsWith("\r")) {
            if (!content.startsWith("\n")) {
                content = "\n" + content;
            }
        } else {
            content = eol + content;
        }
    }

    await writeFile(target, content, options);
}

export async function truncate(
    target: string | FileSystemFileHandle,
    size = 0,
    options: FileSystemOptions = {}
): Promise<void> {
    const handle = typeof target === "object"
        ? target
        : await getFileHandle(target, { root: options.root });

    try {
        const writer = await handle.createWritable({ keepExistingData: true });
        await writer.truncate(size);
        await writer.close();
    } catch (err) {
        throw wrapFsError(err, "file");
    }
}

export async function remove(path: string, options: RemoveOptions = {}): Promise<void> {
    const parent = dirname(path);
    const name = basename(path);
    const dir = await getDirHandle(parent, { root: options.root });
    await rawOp(dir.removeEntry(name, options), "directory");
}

export async function rename(
    oldPath: string,
    newPath: string,
    options: FileSystemOptions = {}
): Promise<void> {
    return await copyInBrowser(oldPath, newPath, {
        root: options.root,
        recursive: true,
        move: true,
    });
}

export async function copy(src: string, dest: string, options?: CopyOptions): Promise<void>;
export async function copy(
    src: FileSystemFileHandle,
    dest: FileSystemFileHandle | FileSystemDirectoryHandle
): Promise<void>;
export async function copy(
    src: FileSystemDirectoryHandle,
    dest: FileSystemDirectoryHandle,
    options?: Pick<CopyOptions, "recursive">
): Promise<void>;
export async function copy(
    src: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: CopyOptions = {}
): Promise<void> {
    return copyInBrowser(src, dest, options);
}

async function copyInBrowser(
    src: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: FileSystemOptions & {
        recursive?: boolean;
        move?: boolean;
    } = {}
): Promise<void> {
    if (typeof src === "object" && typeof dest !== "object") {
        throw new TypeError("The destination must be a FileSystemHandle.");
    } else if (typeof dest === "object" && typeof src !== "object") {
        throw new TypeError("The source must be a FileSystemHandle.");
    } else if (typeof src === "object" && typeof dest === "object") {
        if (src.kind === "file") {
            if (dest.kind === "file") {
                return await copyFileHandleToFileHandle(src, dest);
            } else {
                return await copyFileHandleToDirHandle(src, dest);
            }
        } else if (dest.kind === "directory") {
            if (!options.recursive) {
                throw new InvalidOperationError(
                    "Cannot copy a directory without the 'recursive' option");
            }

            return await copyDirHandleToDirHandle(src, dest);
        } else {
            throw new NotDirectoryError("The destination location is not a directory");
        }
    }

    const oldParent = dirname(src as string);
    const oldName = basename(src as string);

    let oldDir = await getDirHandle(oldParent, { root: options.root });
    const {
        value: oldFile,
        error: oldErr,
    } = await try_(rawOp(oldDir.getFileHandle(oldName), "file"));

    if (oldFile) {
        const newParent = dirname(dest as string);
        const newName = basename(dest as string);
        let newDir = await getDirHandle(newParent, { root: options.root });
        const {
            error: newErr,
            value: newFile,
        } = await try_(rawOp(newDir.getFileHandle(newName, {
            create: true,
        }), "file"));

        if (newFile) {
            await copyFileHandleToFileHandle(oldFile, newFile);

            if (options.move) {
                await rawOp(oldDir.removeEntry(oldName), "directory");
            }
        } else if (as(newErr, Exception)?.name === "IsDirectoryError" && !options.move) {
            // The destination is a directory, copy the file into the new path
            // with the old name.
            newDir = await rawOp(newDir.getDirectoryHandle(newName), "directory");
            await copyFileHandleToDirHandle(oldFile, newDir);
        } else {
            throw newErr;
        }
    } else if (as(oldErr, Exception)?.name === "IsDirectoryError") {
        if (!options.recursive) {
            throw new InvalidOperationError(
                "Cannot copy a directory without the 'recursive' option");
        }

        const parent = oldDir;
        oldDir = await rawOp(oldDir.getDirectoryHandle(oldName), "directory");
        const newDir = await getDirHandle(dest as string, { root: options.root, create: true });

        await copyDirHandleToDirHandle(oldDir, newDir);

        if (options.move) {
            await rawOp(parent.removeEntry(oldName, { recursive: true }), "directory");
        }
    } else {
        throw oldErr;
    }
}

async function copyFileHandleToFileHandle(
    src: FileSystemFileHandle,
    dest: FileSystemFileHandle
) {
    try {
        const srcFile = await src.getFile();
        const destFile = await dest.createWritable();
        await srcFile.stream().pipeTo(destFile);
    } catch (err) {
        throw wrapFsError(err, "file");
    }
}

async function copyFileHandleToDirHandle(
    src: FileSystemFileHandle,
    dest: FileSystemDirectoryHandle
) {
    try {
        const srcFile = await src.getFile();
        const newFile = await dest.getFileHandle(src.name, { create: true });
        const destFile = await newFile.createWritable();

        await srcFile.stream().pipeTo(destFile);
    } catch (err) {
        throw wrapFsError(err, "file");
    }
}

async function copyDirHandleToDirHandle(
    src: FileSystemDirectoryHandle,
    dest: FileSystemDirectoryHandle
) {
    const entries = src.entries();

    for await (const [_, entry] of entries) {
        if (entry.kind === "file") {
            try {
                const oldFile = await (entry as FileSystemFileHandle).getFile();
                const newFile = await dest.getFileHandle(entry.name, {
                    create: true,
                });
                const reader = oldFile.stream();
                const writer = await newFile.createWritable();

                await reader.pipeTo(writer);
            } catch (err) {
                throw wrapFsError(err, "file");
            }
        } else {
            const newSubDir = await rawOp(dest.getDirectoryHandle(entry.name, {
                create: true,
            }), "directory");
            await copyDirHandleToDirHandle(entry as FileSystemDirectoryHandle, newSubDir);
        }
    }
}

export function createReadableStream(
    target: string | FileSystemFileHandle,
    options: FileSystemOptions = {}
): ReadableStream<Uint8Array<ArrayBuffer>> {
    return resolveByteStream((async () => {
        const handle = typeof target === "object"
            ? target
            : await getFileHandle(target, { root: options.root });
        const file = await rawOp(handle.getFile(), "file");
        return file.stream();
    })());
}

export function createWritableStream(
    target: string | FileSystemFileHandle,
    options: Omit<WriteFileOptions, "signal"> = {}
): WritableStream<Uint8Array<ArrayBuffer>> {
    const {
        readable,
        writable,
    } = new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>();
    const getHandle = typeof target === "object"
        ? Promise.resolve(target)
        : getFileHandle(target, { root: options.root, create: true });

    getHandle.then(handle => createFileHandleWritableStream(handle, options))
        .then(stream => readable.pipeTo(stream));

    return writable;
}

async function createFileHandleWritableStream(handle: FileSystemFileHandle, options: {
    append?: boolean;
}): Promise<FileSystemWritableFileStream> {
    const stream = await rawOp(handle.createWritable({
        keepExistingData: options?.append ?? false,
    }), "file");

    if (options.append) {
        const file = await rawOp(handle.getFile(), "file");
        file.size && stream.seek(file.size);
    }

    return stream;
}
