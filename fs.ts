/**
 * Universal file system APIs for both server and browser applications.
 * 
 * This module is guaranteed to work in the following environments:
 * 
 * - Node.js
 * - Deno
 * - Bun
 * - Modern browsers
 * - Cloudflare Workers (limited support and experimental)
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
 * This module also provides limited support for Cloudflare Workers, however it
 * requires setting the `[site].bucket` option in the `wrangler.toml` file. Only
 * the reading functions are supported, such as {@link readFile} and
 * {@link readDir}, these functions allow us reading static files in the workers,
 * writing functions is not implemented at the moment. More details about
 * serving static assets in Cloudflare Workers can be found here:
 * [Add static assets to an existing Workers project](https://developers.cloudflare.com/workers/configuration/sites/start-from-worker/).
 * 
 * **Errors:**
 * 
 * When a file system operation fails, this module throws one of following
 * derived {@link Exception} instances:
 * 
 * - `NotAllowedError`: The operation is not allowed, such as being blocked by
 *   the permission system.
 * - `NotFoundError`: The file or directory does not exist.
 * - `AlreadyExistsError`: The file or directory already exists.
 * - `InvalidOperationError`: The operation is invalid, such as trying to copy a
 *   directory without the `recursive` option.
 * - `IsDirectoryError`: The path is a directory, not a file.
 * - `NotDirectoryError`: The path is a file, not a directory.
 * - `FileTooLargeError`: The file is too large, or the file system doesn't have
 *   enough space to store the new content.
 * - `FilesystemLoopError`:  Too many symbolic links were encountered when
 *   resolving the filename.
 * - `BusyError`: The file is busy at the moment, such as being locked by
 *   another program.
 * - `InterruptedError`: The operation is interrupted by the underlying file
 *   system.
 * - `NotSupportedError`: The operation is not supported by the current
 *   environment.
 * 
 * Other errors may also be thrown by the runtime, such as `TypeError`.
 * @module
 */

import bytes from "./bytes.ts";
import { isDeno, isNodeLike } from "./env.ts";
import { Exception, throwUnsupportedRuntimeError } from "./error.ts";
import { getMIME } from "./filetype.ts";
import { InvalidOperationError, NotDirectoryError } from "./fs/errors.ts";
import type { FileInfo, DirEntry, FileSystemOptions, DirTree } from "./fs/types.ts";
import { ensureFsTarget, fixDirEntry, makeTree, rawOp, wrapFsError } from "./fs/util.ts";
import { resolveHomeDir } from "./fs/util/server.ts";
import {
    getDirHandle,
    getFileHandle,
    stat as webStat,
    mkdir as webMakeDir,
    readDir as webReadDir,
    readFile as webReadFile,
    readFileAsFile as webReadFileAsFile,
    writeFile as webWriteFile,
    truncate as webTruncate,
    remove as webRemove,
    rename as webRename,
    copy as webCopy,
    createReadableStream as webCreateReadableStream,
    createWritableStream as webCreateWritableStream,
} from "./fs/web.ts";
import { as } from "./object.ts";
import { basename, extname, join } from "./path.ts";
import { readAsArray, readAsText, resolveByteStream } from "./reader.ts";
import runtime, { platform } from "./runtime.ts";

export * from "./fs/errors.ts";
export type { FileSystemOptions, FileInfo, DirEntry, DirTree };
export { getDirHandle, getFileHandle };

/**
 * Platform-specific end-of-line marker. The value is `\r\n` in Windows
 * server-side environments, and `\n` elsewhere.
 */
export const EOL: "\n" | "\r\n" = (() => {
    if (typeof Deno === "object" && typeof Deno.build === "object") {
        return Deno.build.os === "windows" ? "\r\n" : "\n";
    } else if (typeof process === "object" && typeof process.platform === "string") {
        return process.platform === "win32" ? "\r\n" : "\n";
    } else {
        return "\n";
    }
})();

/**
 * Options for the {@link getDirHandle} function.
 */
export interface GetDirOptions extends FileSystemOptions {
    /**
     * Create the directory if not exist.
     */
    create?: boolean;
    /**
     * Used when `create` is `true`, recursively create the directory and its
     * parent directories.
     */
    recursive?: boolean;
}

/**
 * Options for the {@link getFileHandle} function.
 */
export interface GetFileOptions extends FileSystemOptions {
    /**
     * Create the file if not exist.
     */
    create?: boolean;
}

/**
 * Checks if the given path exists.
 * 
 * This function may throw an error if the path is invalid or the operation is
 * not allowed.
 * 
 * NOTE: This function can also be used in Cloudflare Workers.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { exists } from "@ayonli/jsext/fs";
 * 
 * if (await exists("/path/to/file.txt")) {
 *     console.log("The file exists.");
 * } else {
 *     console.log("The file does not exist.");
 * }
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { exists } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * 
 * if (await exists("/path/to/file.txt", { root })) {
 *     console.log("The file exists.");
 * } else {
 *     console.log("The file does not exist.");
 * }
 * ```
 */
export async function exists(path: string | URL, options: FileSystemOptions = {}): Promise<boolean> {
    try {
        await stat(path, options);
        return true;
    } catch (err) {
        if (as(err, Exception)?.name === "NotFoundError") {
            return false;
        }

        throw err;
    }
}

/**
 * Options for the {@link stat} function.
 */
export interface StatOptions extends FileSystemOptions {
    /**
     * Whether to follow the symbolic link.
     * @default false
     */
    followSymlink?: boolean;
}

/**
 * Returns the information of the given file or directory.
 * 
 * NOTE: This function can also be used in Cloudflare Workers.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { stat } from "@ayonli/jsext/fs";
 * 
 * const info = await stat("/path/to/file.txt");
 * console.log(`${info.name} is a ${info.kind}, its size is ${info.size} bytes, with MIME type ${info.type}.`);
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { stat } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * const info = await stat("/path/to/file.txt", { root });
 * console.log(`${info.name} is a ${info.kind}, its size is ${info.size} bytes, with MIME type ${info.type}.`);
 * ```
 */
export async function stat(
    target: string | URL | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: StatOptions = {}
): Promise<FileInfo> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        return await webStat(target, options);
    }

    const path = await resolveHomeDir(target);

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
            type: kind === "file" ? (getMIME(extname(path)) ?? "") : "",
            mtime: stat.mtime ?? null,
            atime: stat.atime ?? null,
            birthtime: stat.birthtime ?? null,
            mode: stat.mode ?? 0,
            uid: stat.uid ?? 0,
            gid: stat.gid ?? 0,
            isBlockDevice: stat.isBlockDevice ?? false,
            isCharDevice: stat.isCharDevice ?? false,
            isFIFO: stat.isFifo ?? false,
            isSocket: stat.isSocket ?? false,
        };
    } else {
        const fs = await import("node:fs/promises");
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
            type: kind === "file" ? (getMIME(extname(path)) ?? "") : "",
            mtime: stat.mtime ?? null,
            atime: stat.atime ?? null,
            birthtime: stat.birthtime ?? null,
            mode: stat.mode ?? 0,
            uid: stat.uid ?? 0,
            gid: stat.gid ?? 0,
            isBlockDevice: stat.isBlockDevice(),
            isCharDevice: stat.isCharacterDevice(),
            isFIFO: stat.isFIFO(),
            isSocket: stat.isSocket(),
        };
    }
}

/**
 * Options for the {@link mkdir} function.
 */
export interface MkdirOptions extends FileSystemOptions {
    /**
     * Whether to create parent directories if they do not exist.
     */
    recursive?: boolean;
    /**
     * The permission mode of the directory.
     * 
     * NOTE: This option is ignored in the browser and in Windows.
     * @default 0o777
     */
    mode?: number;
}

/**
 * Creates a new directory with the given path.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { mkdir } from "@ayonli/jsext/fs";
 * 
 * await mkdir("/path/to/dir");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { mkdir } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await mkdir("/path/to/dir", { root });
 * ```
 * 
 * @example
 * ```ts
 * // create the directory and its parent directories if not exist
 * import { mkdir } from "@ayonli/jsext/fs";
 * 
 * await mkdir("/path/to/dir", { recursive: true });
 * ```
 */
export async function mkdir(path: string | URL, options: MkdirOptions = {}): Promise<void> {
    path = ensureFsTarget(path);

    if (!(isDeno || isNodeLike)) {
        return await webMakeDir(path, options);
    }

    path = await resolveHomeDir(path);

    if (isDeno) {
        await rawOp(Deno.mkdir(path, options));
    } else {
        const fs = await import("node:fs/promises");
        await rawOp(fs.mkdir(path, options));
    }
}

/**
 * Ensures the directory exists, creating it (and any parent directory) if not.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { ensureDir } from "@ayonli/jsext/fs";
 * 
 * await ensureDir("/path/to/dir");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { ensureDir } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await ensureDir("/path/to/dir", { root });
 * ```
 */
export async function ensureDir(
    path: string | URL,
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

/**
 * Options for the {@link readDir} function.
 */
export interface ReadDirOptions extends FileSystemOptions {
    /**
     * Whether to read the sub-directories recursively.
     */
    recursive?: boolean;
}

/**
 * Reads the directory of the given path and iterates its entries.
 * 
 * NOTE: The order of the entries is not guaranteed.
 * 
 * NOTE: This function can also be used in Cloudflare Workers.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { readDir } from "@ayonli/jsext/fs";
 * 
 * for await (const entry of readDir("/path/to/dir")) {
 *     console.log(`${entry.name} is a ${entry.kind}, its relative path is '${entry.relativePath}'.`);
 * }
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { readDir } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * for await (const entry of readDir("/path/to/dir", { root })) {
 *     console.log(`${entry.name} is a ${entry.kind}, its relative path is '${entry.relativePath}'.`);
 * }
 * ```
 * 
 * @example
 * ```ts
 * // read the sub-directories recursively
 * import { readDir } from "@ayonli/jsext/fs";
 * 
 * for await (const entry of readDir("/path/to/dir", { recursive: true })) {
 *     console.log(`${entry.name} is a ${entry.kind}, its relative path is '${entry.relativePath}'.`);
 * }
 * ```
 */
export async function* readDir(
    target: string | URL | FileSystemDirectoryHandle,
    options: ReadDirOptions = {}
): AsyncIterableIterator<DirEntry> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        yield* webReadDir(target, options);
        return;
    }

    const path = await resolveHomeDir(target);

    if (isDeno) {
        yield* (async function* read(path: string, base: string): AsyncIterableIterator<DirEntry> {
            try {
                for await (const entry of Deno.readDir(path)) {
                    const _entry = fixDirEntry({
                        name: entry.name,
                        kind: entry.isDirectory
                            ? "directory"
                            : entry.isSymlink
                                ? "symlink"
                                : "file",
                        relativePath: join(base, entry.name),
                    });

                    yield _entry;

                    if (options?.recursive && entry.isDirectory) {
                        yield* read(join(path, entry.name), _entry.relativePath);
                    }
                }
            } catch (err) {
                throw wrapFsError(err);
            }
        })(path, "");
    } else {
        const fs = await import("node:fs/promises");

        yield* (async function* read(path: string, base: string): AsyncIterableIterator<DirEntry> {
            const entries = await rawOp(fs.readdir(path, { withFileTypes: true }));

            for (const entry of entries) {
                const _entry = fixDirEntry({
                    name: entry.name,
                    kind: entry.isDirectory()
                        ? "directory"
                        : entry.isSymbolicLink()
                            ? "symlink"
                            : "file",
                    relativePath: join(base, entry.name),
                });

                yield _entry;

                if (options?.recursive && entry.isDirectory()) {
                    yield* read(join(path, entry.name), _entry.relativePath);
                }
            }
        })(path, "");
    }
}

/**
 * Recursively reads the contents of the directory and transform them into a
 * tree structure.
 * 
 * NOTE: Unlike {@link readDir}, the order of the entries returned by this
 * function is guaranteed, they are ordered first by kind (directories before
 * files), then by names alphabetically.
 * 
 * NOTE: This function can also be used in Cloudflare Workers.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { readTree } from "@ayonli/jsext/fs";
 * 
 * const tree = await readTree("/path/to/dir");
 * console.log(tree);
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { readTree } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * const tree = await readTree("/path/to/dir", { root });
 * console.log(tree);
 * ```
 */
export async function readTree(
    target: string | URL | FileSystemDirectoryHandle,
    options: FileSystemOptions = {}
): Promise<DirTree> {
    target = ensureFsTarget(target);

    const entries = (await readAsArray(readDir(target, { ...options, recursive: true })));
    const tree = makeTree<DirEntry, DirTree>(target, entries, true);

    if (!tree.handle && options.root) {
        tree.handle = options.root as FileSystemDirectoryHandle;
    }

    return tree;
}

/**
 * Options for file reading functions, such as {@link readFile},
 * {@link readFileAsText} and {@link readFileAsFile}.
 */
export interface ReadFileOptions extends FileSystemOptions {
    signal?: AbortSignal;
}

/**
 * Reads the content of the given file in bytes.
 * 
 * NOTE: This function can also be used in Cloudflare Workers.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { readFile } from "@ayonli/jsext/fs";
 * 
 * const bytes = await readFile("/path/to/file.txt");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { readFile } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * const bytes = await readFile("/path/to/file.txt", { root });
 * ```
 */
export async function readFile(
    target: string | URL | FileSystemFileHandle,
    options: ReadFileOptions = {}
): Promise<Uint8Array> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        return await webReadFile(target, options);
    }

    const filename = await resolveHomeDir(target);

    if (isDeno) {
        return await rawOp(Deno.readFile(filename, options));
    } else {
        const fs = await import("node:fs/promises");
        const buffer = await rawOp(fs.readFile(filename, options));
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
}

/**
 * Reads the content of the given file as text.
 * 
 * NOTE: This function can also be used in Cloudflare Workers.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { readFileAsText } from "@ayonli/jsext/fs";
 * 
 * const text = await readFileAsText("/path/to/file.txt");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { readFileAsText } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * const text = await readFileAsText("/path/to/file.txt", { root });
 * ```
 * 
 * @example
 * ```ts
 * // with a specific encoding
 * import { readFileAsText } from "@ayonli/jsext/fs";
 * 
 * const text = await readFileAsText("./examples/samples/gb2312.txt", { encoding: "gb2312" });
 * ```
 */
export async function readFileAsText(
    target: string | URL | FileSystemFileHandle,
    options: ReadFileOptions & { encoding?: string; } = {}
): Promise<string> {
    const { encoding, ...rest } = options;
    const file = await readFile(target, rest);
    return await readAsText(file, encoding);
}

/**
 * Reads the file as a `File` object.
 * 
 * NOTE: This function can also be used in Cloudflare Workers.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { readFileAsFile } from "@ayonli/jsext/fs";
 * 
 * const file = await readFileAsFile("/path/to/file.txt");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { readFileAsFile } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * const file = await readFileAsFile("/path/to/file.txt", { root });
 * ```
 */
export async function readFileAsFile(
    target: string | URL | FileSystemFileHandle,
    options: ReadFileOptions = {}
): Promise<File> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        return await webReadFileAsFile(target, options);
    }

    const _stat = await stat(target, options);
    const bytes = await readFile(target, options);
    const type = getMIME(extname(target)) ?? "";
    const file = new File([bytes], basename(target), { type });
    const lastModified = _stat.mtime?.getTime() ?? Date.now();

    Object.defineProperty(file, "lastModified", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: lastModified,
    })
    Object.defineProperty(file, "lastModifiedDate", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: new Date(lastModified),
    });

    Object.defineProperty(file, "webkitRelativePath", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: "",
    });

    return file;
}

/**
 * Options for file writing functions, such as {@link writeFile} and {@link writeLines}.
 */
export interface WriteFileOptions extends FileSystemOptions {
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
}

/**
 * Writes the given data to the file.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { writeFile } from "@ayonli/jsext/fs";
 * 
 * await writeFile("/path/to/file.txt", "Hello, world!");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { writeFile } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await writeFile("/path/to/file.txt", "Hello, world!", { root });
 * ```
 * 
 * @example
 * ```ts
 * // append the data to the file
 * import { writeFile } from "@ayonli/jsext/fs";
 * 
 * await writeFile("/path/to/file.txt", "Hello, world!", { append: true });
 * ```
 * 
 * @example
 * ```ts
 * // write binary data to the file
 * import { writeFile } from "@ayonli/jsext/fs";
 * import bytes from "@ayonli/jsext/bytes";
 * 
 * const data = bytes("Hello, world!");
 * await writeFile("/path/to/file.txt", data)
 * ```
 * 
 * @example
 * ```ts
 * // write a blob to the file
 * import { writeFile } from "@ayonli/jsext/fs";
 * 
 * const blob = new Blob(["Hello, world!"], { type: "text/plain" });
 * await writeFile("/path/to/file.txt", blob);
 * ```
 * 
 * @example
 * ```ts
 * // write a readable stream to the file
 * import { writeFile } from "@ayonli/jsext/fs";
 * 
 * const res = await fetch("https://example.com/file.txt");
 * await writeFile("/path/to/file.txt", res.body!);
 * ```
 */
export async function writeFile(
    target: string | URL | FileSystemFileHandle,
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    options: WriteFileOptions = {}
): Promise<void> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        return await webWriteFile(target, data, options);
    }

    const filename = await resolveHomeDir(target);

    if (isDeno) {
        if (typeof data === "string") {
            return await rawOp(Deno.writeTextFile(filename, data, options));
        } else if (data instanceof Blob) {
            return await rawOp(Deno.writeFile(filename, data.stream(), options));
        } else if (data instanceof ArrayBuffer) {
            return await rawOp(Deno.writeFile(filename, new Uint8Array(data), options));
        } else if (data instanceof Uint8Array) {
            return await rawOp(Deno.writeFile(filename, data, options));
        } else if (ArrayBuffer.isView(data)) {
            return await rawOp(Deno.writeFile(filename, bytes(data), options));
        } else if (data) {
            return await rawOp(Deno.writeFile(filename, data, options));
        }
    } else {
        if (typeof Blob === "function" && data instanceof Blob) {
            const reader = data.stream();
            const writer = createNodeWritableStream(filename, options);
            await reader.pipeTo(writer);
        } else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
            const writer = createNodeWritableStream(filename, options);
            await data.pipeTo(writer);
        } else {
            const fs = await import("node:fs/promises");
            const { append, ...rest } = options;
            let _data: Uint8Array | string;

            if (data instanceof ArrayBuffer) {
                _data = new Uint8Array(data);
            } else if (data instanceof Uint8Array) {
                _data = data;
            } else if (ArrayBuffer.isView(data)) {
                _data = bytes(data);
            } else if (typeof data === "string") {
                _data = data;
            } else {
                throw new TypeError("Unsupported data type");
            }

            return await rawOp(fs.writeFile(filename, _data, {
                flag: append ? "a" : "w",
                ...rest,
            }));
        }
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
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { writeLines } from "@ayonli/jsext/fs";
 * 
 * await writeLines("/path/to/file.txt", ["Hello", "World"]);
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { writeLines } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await writeLines("/path/to/file.txt", ["Hello", "World"], { root });
 * ```
 * 
 * @example
 * ```ts
 * // append the lines to the file
 * import { writeLines } from "@ayonli/jsext/fs";
 * 
 * await writeLines("/path/to/file.txt", ["Hello", "World"], { append: true });
 * ```
 */
export async function writeLines(
    target: string | URL | FileSystemFileHandle,
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

/**
 * Truncates (or extends) the file to reach the specified `size`. If `size` is
 * not specified then the entire file contents are truncated.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { stat, truncate } from "@ayonli/jsext/fs";
 * 
 * await truncate("/path/to/file.txt", 1024);
 * const info = await stat("/path/to/file.txt");
 * console.assert(info.size === 1024);
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { stat, truncate } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await truncate("/path/to/file.txt", 1024, { root });
 * const info = await stat("/path/to/file.txt", { root });
 * console.assert(info.size === 1024);
 * ```
 * 
 * @example
 * ```ts
 * // truncate the file to zero size
 * import { stat, truncate } from "@ayonli/jsext/fs";
 * 
 * await truncate("/path/to/file.txt");
 * const info = await stat("/path/to/file.txt");
 * console.assert(info.size === 0);
 * ```
 */
export async function truncate(
    target: string | URL | FileSystemFileHandle,
    size = 0,
    options: FileSystemOptions = {}
): Promise<void> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        return await webTruncate(target, size, options);
    }

    const filename = await resolveHomeDir(target);

    if (isDeno) {
        await rawOp(Deno.truncate(filename, size));
    } else {
        const fs = await import("node:fs/promises");
        await rawOp(fs.truncate(filename, size));
    }
}

/**
 * Options for the {@link remove} function.
 */
export interface RemoveOptions extends FileSystemOptions {
    /**
     * Whether to delete the sub-directories and files recursively. This option
     * is required in order to remove a non-empty directory.
     */
    recursive?: boolean;
}

/**
 * Removes the file or directory of the given path from the file system.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { remove } from "@ayonli/jsext/fs";
 * 
 * await remove("/path/to/file.txt");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { remove } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await remove("/path/to/file.txt", { root });
 * ```
 * 
 * @example
 * ```ts
 * // remove the directory and its contents recursively
 * import { remove } from "@ayonli/jsext/fs";
 * 
 * await remove("/path/to/dir", { recursive: true });
 * ```
 */
export async function remove(path: string | URL, options: RemoveOptions = {}): Promise<void> {
    path = ensureFsTarget(path);

    if (!(isDeno || isNodeLike)) {
        return await webRemove(path, options);
    }

    path = await resolveHomeDir(path);

    if (isDeno) {
        await rawOp(Deno.remove(path, options));
    } else {
        const fs = await import("node:fs/promises");

        if (typeof fs.rm === "function") {
            await rawOp(fs.rm(path, options));
        } else {
            try {
                const _stat = await fs.stat(path);

                if (_stat.isDirectory()) {
                    await fs.rmdir(path, options);
                } else {
                    await fs.unlink(path);
                }
            } catch (err) {
                throw wrapFsError(err);
            }
        }
    }
}

/**
 * Renames the file or directory from the old path to the new path.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { rename } from "@ayonli/jsext/fs";
 * 
 * await rename("/path/to/old.txt", "/path/to/new.txt");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { rename } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await rename("/path/to/old.txt", "/path/to/new.txt", { root });
 * ```
 */
export async function rename(
    oldPath: string | URL,
    newPath: string | URL,
    options: FileSystemOptions = {}
): Promise<void> {
    oldPath = ensureFsTarget(oldPath);
    newPath = ensureFsTarget(newPath);

    if (!(isDeno || isNodeLike)) {
        return await webRename(oldPath, newPath, options);
    }

    oldPath = await resolveHomeDir(oldPath);
    newPath = await resolveHomeDir(newPath);

    if (isDeno) {
        await rawOp(Deno.rename(oldPath, newPath));
    } else {
        const fs = await import("node:fs/promises");
        await rawOp(fs.rename(oldPath, newPath));
    }
}

/**
 * Options for the {@link copy} function.
 */
export interface CopyOptions extends FileSystemOptions {
    /**
     * Whether to copy the directory recursively, which means to copy the
     * directory and all its contents.
     */
    recursive?: boolean;
}

/**
 * Copies the file or directory (and its contents) from the old location to the
 * new location.
 * 
 * NOTE: If the old location is a file and the new location is a directory, the
 * file will be copied into the new directory with the old name.
 * 
 * NOTE: In Unix/Linux systems, when using the `cp -R` command to copy a path
 * without an ending slash, the command will copy the directory itself into the
 * new path if the new path already exists. This function does not have this
 * behavior, it does not distinguish between a path with a trailing slash and a
 * path without it. So when copying a directory, this function always copy its
 * contents to the new path, whether the new path already exists or not.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { copy } from "@ayonli/jsext/fs";
 * 
 * await copy("/path/to/old.txt", "/path/to/new.txt");
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { copy } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * await copy("/path/to/old.txt", "/path/to/new.txt", { root });
 * ```
 * 
 * @example
 * ```ts
 * // copy a directory and its contents recursively
 * import { copy } from "@ayonli/jsext/fs";
 * 
 * await copy("/path/to/dir", "/path/to/new", { recursive: true });
 * ```
 * 
 * @example
 * ```ts
 * // copy a file to a directory
 * import { copy, exists } from "@ayonli/jsext/fs";
 * 
 * await copy("/path/to/file.txt", "/path/to/dir");
 * console.assert(await exists("/path/to/dir/file.txt"));
 * ```
 */
export async function copy(
    src: string | URL,
    dest: string | URL,
    options?: CopyOptions
): Promise<void>;
/**
 * @example
 * ```ts
 * // copy a file from the device's file system to the browser's file system (Chromium only)
 * import { copy, getFileHandle } from "@ayonli/jsext/fs";
 * 
 * const file1 = await window.showOpenFilePicker();
 * const file2 = await getFileHandle("/path/to/file.txt");
 * 
 * await copy(file1[0], file2);
 * ```
 */
export async function copy(
    src: FileSystemFileHandle,
    dest: FileSystemFileHandle | FileSystemDirectoryHandle
): Promise<void>;
/**
 * @example
 * ```ts
 * // copy a directory from the device's file system to the browser's file system (Chromium only)
 * import { copy, getDirHandle } from "@ayonli/jsext/fs";
 * 
 * const dir1 = await window.showDirectoryPicker();
 * const dir2 = await getDirHandle("/path/to/dir");
 * 
 * await copy(dir1, dir2, { recursive: true });
 * ```
 */
export async function copy(
    src: FileSystemDirectoryHandle,
    dest: FileSystemDirectoryHandle,
    options?: Pick<CopyOptions, "recursive">
): Promise<void>;
export async function copy(
    src: string | URL | FileSystemFileHandle | FileSystemDirectoryHandle,
    dest: string | URL | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: CopyOptions = {}
): Promise<void> {
    src = ensureFsTarget(src);
    dest = ensureFsTarget(dest);

    if (typeof src === "object" || typeof dest === "object" || !(isDeno || isNodeLike)) {
        // @ts-ignore internal call
        return await webCopy(src, dest, options);
    }

    src = await resolveHomeDir(src);
    dest = await resolveHomeDir(dest);

    const oldStat = await stat(src, { followSymlink: true });
    const isDirSrc = oldStat.kind === "directory";
    let isDirDest = false;

    if (isDirSrc && !options.recursive) {
        throw new InvalidOperationError("Cannot copy a directory without the 'recursive' option");
    }

    try {
        const newStat = await stat(dest, { followSymlink: true });
        isDirDest = newStat.kind === "directory";

        if (isDirSrc && !isDirDest) {
            throw new NotDirectoryError(`'${dest}' is not a directory`);
        }
    } catch {
        if (isDirSrc) {
            await mkdir(dest);
            isDirDest = true;
        }
    }

    if (isDeno) {
        if (isDirSrc) {
            const entries = readDir(src, { recursive: true });

            for await (const entry of entries) {
                const _oldPath = join(src, entry.relativePath);
                const _newPath = join(dest, entry.relativePath);

                if (entry.kind === "directory") {
                    await rawOp(Deno.mkdir(_newPath));
                } else {
                    await rawOp(Deno.copyFile(_oldPath, _newPath));
                }
            }
        } else {
            const _newPath = isDirDest ? join(dest, basename(src)) : dest;
            await rawOp(Deno.copyFile(src, _newPath));
        }
    } else {
        const fs = await import("node:fs/promises");

        if (isDirSrc) {
            const entries = readDir(src, { recursive: true });

            for await (const entry of entries) {
                const _oldPath = join(src, entry.relativePath);
                const _newPath = join(dest, entry.relativePath);

                if (entry.kind === "directory") {
                    await rawOp(fs.mkdir(_newPath));
                } else {
                    await rawOp(fs.copyFile(_oldPath, _newPath));
                }
            }
        } else {
            const _newPath = isDirDest ? join(dest, basename(src)) : dest;
            await rawOp(fs.copyFile(src, _newPath));
        }
    }
}

/**
 * Options for the {@link link} function.
 */
export interface LinkOptions {
    /**
     * Create a symbolic link instead of a hard link.
     */
    symbolic?: boolean;
}

/**
 * Creates a hard link (or symbolic link) from the source path to the destination
 * path.
 * 
 * NOTE: This function is only available in Node.js, Deno and Bun.
 * 
 * @example
 * ```ts
 * // create a hard link
 * import { link } from "@ayonli/jsext/fs";
 * 
 * await link("/path/to/file.txt", "/path/to/link.txt");
 * ```
 * 
 * @example
 * ```ts
 * // create a symbolic link
 * import { link } from "@ayonli/jsext/fs";
 * 
 * await link("/path/to/file.txt", "/path/to/link.txt", { symbolic: true });
 * ```
 */
export async function link(
    src: string | URL,
    dest: string | URL,
    options: LinkOptions = {}
): Promise<void> {
    src = ensureFsTarget(src);
    dest = ensureFsTarget(dest);
    src = await resolveHomeDir(src);
    dest = await resolveHomeDir(dest);

    if (isDeno) {
        if (options.symbolic) {
            if (platform() === "windows") {
                const _stat = await stat(src);
                await rawOp(Deno.symlink(src, dest, {
                    type: _stat.kind === "directory" ? "dir" : "file",
                }));
            } else {
                await rawOp(Deno.symlink(src, dest));
            }
        } else {
            await rawOp(Deno.link(src, dest));
        }
    } else if (isNodeLike) {
        const fs = await import("node:fs/promises");

        if (options.symbolic) {
            if (platform() === "windows") {
                const _stat = await stat(src);
                await rawOp(fs.symlink(src, dest, _stat.kind === "directory" ? "dir" : "file"));
            } else {
                await rawOp(fs.symlink(src, dest));
            }
        } else {
            await rawOp(fs.link(src, dest));
        }
    } else {
        throwUnsupportedRuntimeError();
    }
}

/**
 * Returns the destination path of a symbolic link.
 * 
 * NOTE: This function is only available in Node.js, Deno and Bun.
 * 
 * @example
 * ```ts
 * import { readLink } from "@ayonli/jsext/fs";
 * 
 * const dest = await readLink("/path/to/link.txt");
 * console.log(dest);
 * ```
 */
export async function readLink(path: string | URL): Promise<string> {
    path = ensureFsTarget(path);
    path = await resolveHomeDir(path);

    if (isDeno) {
        return await rawOp(Deno.readLink(path));
    } else if (isNodeLike) {
        const fs = await import("node:fs/promises");
        return await rawOp(fs.readlink(path));
    } else {
        throwUnsupportedRuntimeError();
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
 * NOTE: This function is only available in Node.js, Deno and Bun, and only
 * works in Unix/Linux systems, in other environments, it's a no-op.
 * 
 * @example
 * ```ts
 * import { chmod } from "@ayonli/jsext/fs";
 * 
 * // Change the file's permission to read/write for owner, read for group and others.
 * await chmod("/path/to/file.txt", 0o644);
 * ```
 */
export async function chmod(path: string | URL, mode: number): Promise<void> {
    if (platform() !== "windows") {
        path = ensureFsTarget(path);
        path = await resolveHomeDir(path);

        if (isDeno) {
            await rawOp(Deno.chmod(path, mode));
        } else if (isNodeLike) {
            const fs = await import("node:fs/promises");
            await rawOp(fs.chmod(path, mode));
        }
    }
}

/**
 * Changes the owner and group of the specified file or directory.
 * 
 * NOTE: This function is only available in Node.js, Deno and Bun, and only
 * works in Unix/Linux systems, in other environments, it's a no-op.
 * 
 * @example
 * ```ts
 * import { chown } from "@ayonli/jsext/fs";
 * 
 * // Change the owner and group of the file to root.
 * await chown("/path/to/file.txt", 0, 0);
 * ```
 */
export async function chown(path: string, uid: number, gid: number): Promise<void> {
    if (platform() !== "windows") {
        path = ensureFsTarget(path);
        path = await resolveHomeDir(path);

        if (isDeno) {
            await rawOp(Deno.chown(path, uid, gid));
        } else if (isNodeLike) {
            const fs = await import("node:fs/promises");
            await rawOp(fs.chown(path, uid, gid));
        }
    }
}

/**
 * Changes the access (`atime`) and modification (`mtime`) times of the file
 * or directory. Given times are either in seconds (UNIX epoch time) or as `Date`
 * objects.
 * 
 * NOTE: This function only works in Node.js, Deno and Bun, in other
 * environments, it's a no-op.
 * 
 * @example
 * ```ts
 * import { utimes } from "@ayonli/jsext/fs";
 * 
 * // Set the access and modification times to the current time.
 * await utimes("/path/to/file.txt", Date.now(), Date.now());
 * ```
 */
export async function utimes(
    path: string | URL,
    atime: number | Date,
    mtime: number | Date
): Promise<void> {
    path = ensureFsTarget(path);
    path = await resolveHomeDir(path);

    if (isDeno) {
        await rawOp(Deno.utime(path, atime, mtime));
    } else if (isNodeLike) {
        const fs = await import("node:fs/promises");
        await rawOp(fs.utimes(path, atime, mtime));
    }
}

/**
 * Creates a readable stream for the target file.
 * 
 * NOTE: In Node.js, this function requires Node.js v18.0 or above.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { createReadableStream } from "@ayonli/jsext/fs";
 * import { readAsText } from "@ayonli/jsext/reader";
 * 
 * const input = createReadableStream("/path/to/file.txt");
 * 
 * const text = await readAsText(input);
 * console.log(text);
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { createReadableStream } from "@ayonli/jsext/fs";
 * import { readAsText } from "@ayonli/jsext/reader";
 * 
 * const root = await window.showDirectoryPicker();
 * const input = createReadableStream("/path/to/file.txt", { root });
 * 
 * const text = await readAsText(input);
 * console.log(text);
 * ```
 */
export function createReadableStream(
    target: string | URL | FileSystemFileHandle,
    options: FileSystemOptions = {}
): ReadableStream<Uint8Array> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        return webCreateReadableStream(target, options);
    }

    if (isDeno) {
        return resolveByteStream((async () => {
            const filename = await resolveHomeDir(target);
            const file = await rawOp(Deno.open(filename, { read: true }));
            return file.readable;
        })());
    } else {
        let reader: import("node:fs").ReadStream;
        return new ReadableStream<Uint8Array>({
            async start(controller) {
                const fs = await import("node:fs");
                const filename = await resolveHomeDir(target as string);

                reader = fs.createReadStream(filename);
                reader.on("data", (chunk: Buffer) => {
                    const bytes = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
                    controller.enqueue(bytes);
                });
                reader.on("end", () => controller.close());
                reader.on("error", (err: Error) => controller.error(err));
            },
            cancel(reason = undefined) {
                reader.destroy(reason);
            },
        });
    }
}

/**
 * Creates a writable stream for the target file.
 * 
 * NOTE: In Node.js, this function requires Node.js v18.0 or above.
 * 
 * @example
 * ```ts
 * // with the default storage
 * import { createWritableStream } from "@ayonli/jsext/fs";
 * 
 * const output = createWritableStream("/path/to/file.txt");
 * const res = await fetch("https://example.com/file.txt");
 * 
 * await res.body!.pipeTo(output);
 * ```
 * 
 * @example
 * ```ts
 * // with a user-selected directory as root (Chromium only)
 * import { createWritableStream } from "@ayonli/jsext/fs";
 * 
 * const root = await window.showDirectoryPicker();
 * const output = createWritableStream("/path/to/file.txt", { root });
 * const res = await fetch("https://example.com/file.txt");
 * 
 * await res.body!.pipeTo(output);
 * ```
 */
export function createWritableStream(
    target: string | URL | FileSystemFileHandle,
    options: Omit<WriteFileOptions, "signal"> = {}
): WritableStream<Uint8Array> {
    target = ensureFsTarget(target);

    if (typeof target === "object" || !(isDeno || isNodeLike)) {
        return webCreateWritableStream(target, options);
    }

    const filename = target;

    if (isDeno) {
        const { readable, writable } = new TransformStream();
        resolveHomeDir(filename).then(filename => Deno.open(filename, {
            write: true,
            create: true,
            append: options.append ?? false,
        }))
            .then(file => file.writable)
            .then(stream => readable.pipeTo(stream));
        return writable;
    } else {
        return createNodeWritableStream(filename, options);
    }
}

function createNodeWritableStream(filename: string, options: {
    append?: boolean;
    mode?: number;
    signal?: AbortSignal;
}): WritableStream<Uint8Array> {
    let dest: import("node:fs").WriteStream;
    return new WritableStream<Uint8Array>({
        async start() {
            const { append, ...rest } = options;
            const { createWriteStream } = await import("node:fs");
            filename = await resolveHomeDir(filename);
            dest = createWriteStream(filename, {
                flags: append ? "a" : "w",
                ...rest,
            });
        },
        write(chunk) {
            return new Promise<void>((resolve, reject) => {
                dest.write(chunk, (err) => err ? reject(err) : resolve());
            });
        },
        close() {
            return new Promise((resolve) => {
                dest.end(() => resolve());
            });
        },
        abort(reason) {
            dest.destroy(reason);
        }
    });
}
