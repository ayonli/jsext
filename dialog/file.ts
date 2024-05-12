import { basename, join } from "../path.ts";
import { isBrowserWindow, isDeno, isNodeLike } from "../env.ts";
import { platform } from "../runtime.ts";
import { isWSL, which } from "../cli.ts";
import { readAsObjectURL, toAsyncIterable } from "../reader.ts";
import { readFile } from "./terminal/util.ts";
import {
    macPickFolder,
    macPickFiles,
    macPickFile,
} from "./terminal/file/mac.ts";
import {
    linuxPickFolder,
    linuxPickFiles,
    linuxPickFile,
} from "./terminal/file/linux.ts";
import {
    windowsPickFolder,
    windowsPickFiles,
    windowsPickFile,
} from "./terminal/file/windows.ts";
import {
    browserPickFolder,
    browserPickFile,
    browserPickFiles,
} from "./terminal/file/browser.ts";
import { writeFile } from "../fs.ts";

/**
 * Open the file picker dialog and pick a file, this function returns the file's
 * path or a `FileSystemFileHandle` in the browser.
 * 
 * NOTE: Browser support is limited to the chromium family.
 */
export async function pickFile(options: {
    /** Custom the dialog's title. */
    title?: string | undefined;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string | undefined;
    /** Open the dialog in save mode. */
    forSave?: boolean;
    /** The default name of the file to save when `forSave` is set. */
    defaultName?: string | undefined;
} = {}): Promise<string | FileSystemFileHandle | null> {
    const _platform = platform();

    // @ts-ignore for history compatibility
    if (options["save"]) {
        options.forSave = true;
    }

    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        return await browserPickFile(options.type, {
            forSave: options.forSave,
            defaultName: options.defaultName,
        });
    } else if (_platform === "darwin") {
        return await macPickFile(options.title, {
            type: options.type,
            forSave: options?.forSave,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "windows" || isWSL()) {
        return await windowsPickFile(options.title, {
            type: options.type,
            forSave: options?.forSave,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFile(options.title, {
            type: options.type,
            forSave: options?.forSave,
            defaultName: options?.defaultName,
        });
    }

    throw new Error("Unsupported platform");
}

/**
 * Open the file picker dialog and pick multiple files, this function returns the
 * paths or `FileSystemFileHandle` objects in the browser of the files selected.
 * 
 * NOTE: Browser support is limited to the chromium family.
 */
export async function pickFiles(options: {
    /** Custom the dialog's title. */
    title?: string;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string;
} = {}): Promise<string[] | FileSystemFileHandle[]> {
    const _platform = platform();

    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        return await browserPickFiles(options.type);
    } else if (_platform === "darwin") {
        return await macPickFiles(options.title, options.type);
    } else if (_platform === "windows" || isWSL()) {
        return await windowsPickFiles(options.title, options.type);
    } else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFiles(options.title, options.type);
    }

    throw new Error("Unsupported platform");
}

/**
 * Open the file picker dialog and pick a directory, this function returns the
 * directory's path or `FileSystemDirectoryHandle` in the browser.
 * 
 * NOTE: Browser support is limited to the chromium family.
 */
export async function pickDirectory(options: {
    /** Custom the dialog's title. */
    title?: string;
} = {}): Promise<string | FileSystemDirectoryHandle | null> {
    const _platform = platform();

    if (typeof (globalThis as any)["showDirectoryPicker"] === "function") {
        return await browserPickFolder();
    } else if (_platform === "darwin") {
        return await macPickFolder(options.title);
    } else if (_platform === "windows" || isWSL()) {
        return await windowsPickFolder(options.title);
    } else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFolder(options.title);
    }

    throw new Error("Unsupported platform");
}

/** Open the file picker dialog and pick a file to open. */
export function openFile(options?: {
    /** Custom the dialog's title. This option is ignored in the browser. */
    title?: string;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string;
}): Promise<File | null>;
/** Open the file picker dialog and pick multiple files to open. */
export function openFile(options: {
    title?: string;
    type?: string;
    multiple: true;
}): Promise<File[]>;
/** Open the file picker dialog and pick a directory to open. */
export function openFile(options: {
    title?: string;
    directory: true;
}): Promise<File[]>;
export async function openFile(options: {
    title?: string;
    type?: string;
    multiple?: boolean;
    directory?: boolean;
} = {}): Promise<File | File[] | null> {
    const { title = "", type = "", multiple = false, directory = false } = options;

    if (directory && typeof (globalThis as any)["showDirectoryPicker"] === "function") {
        const files: File[] = [];
        const dir = await browserPickFolder();

        if (!dir) {
            return files;
        }

        await (async function walk(dir: FileSystemDirectoryHandle, base = "") {
            const entries = (dir as any).entries() as AsyncIterable<[string, FileSystemHandle]>;

            for await (const [_, entry] of entries) {
                const path = join(base, entry.name);

                if (entry.kind === "file") {
                    const file = await (entry as FileSystemFileHandle).getFile();

                    Object.defineProperty(file, "webkitRelativePath", {
                        configurable: true,
                        enumerable: true,
                        writable: false,
                        value: path ?? "",
                    });

                    files.push(file);
                } else {
                    await walk(entry as FileSystemDirectoryHandle, path);
                }
            }
        })(dir);

        return files;
    } else if (typeof (globalThis as any)["showOpenPicker"] === "function") {
        if (multiple) {
            const handles = await browserPickFiles(type);
            const files: File[] = [];

            for (const handle of handles) {
                const file = await handle.getFile();
                files.push(file);
            }

            return files;
        } else {
            const handle = await browserPickFile(type);
            return handle ? await handle.getFile() : null;
        }
    } else if (isBrowserWindow) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type ?? "";
        input.multiple = multiple ?? false;
        input.webkitdirectory = directory ?? false;

        return await new Promise<File | File[] | null>(resolve => {
            input.onchange = () => {
                const files = input.files;

                if (directory || multiple) {
                    resolve(files ? [...files] : []);
                } else {
                    resolve(files ? (files[0] ?? null) : null);
                }
            };
            input.oncancel = () => {
                if (directory || multiple) {
                    resolve([]);
                } else {
                    resolve(null);
                }
            };
            input.click();
        });
    } else if (isDeno || isNodeLike) {
        let filename: string | null | undefined;
        let filenames: string[] | null | undefined;
        let dirname: string | null | undefined;

        if (directory) {
            dirname = await pickDirectory({ title }) as string | null;
        } else if (multiple) {
            filenames = await pickFiles({ title, type }) as string[];
        } else {
            filename = await pickFile({ title, type }) as string | null;
        }

        if (dirname) {
            const folder = basename(dirname);
            const files: { path: string, relativePath: string; }[] = [];

            if (typeof Deno === "object") {
                await (async function walk(dirname: string, relativePath = "") {
                    for await (const entry of Deno.readDir(dirname)) {
                        if (entry.isFile) {
                            files.push({
                                path: join(dirname, entry.name),
                                relativePath: relativePath + "/" + entry.name,
                            });
                        } else if (entry.isDirectory) {
                            await walk(join(dirname, entry.name), relativePath + "/" + entry.name);
                        } else if (entry.isSymlink) {
                            const symlink = await Deno.readLink(join(dirname, entry.name));
                            await walk(symlink, relativePath + "/" + entry.name);
                        }
                    }
                })(dirname, folder);
            } else {
                const { readdir, readlink } = await import("fs/promises");

                await (async function walk(dirname: string, relativePath = "") {
                    const entries = await readdir(dirname, { withFileTypes: true });

                    for (const entry of entries) {
                        if (entry.isFile()) {
                            files.push({
                                path: join(dirname, entry.name),
                                relativePath: relativePath + "/" + entry.name,
                            });
                        } else if (entry.isDirectory()) {
                            await walk(join(dirname, entry.name), relativePath + "/" + entry.name);
                        } else if (entry.isSymbolicLink()) {
                            const symlink = await readlink(join(dirname, entry.name));
                            await walk(symlink, relativePath + "/" + entry.name);
                        }
                    }
                })(dirname, folder);
            }

            return await Promise.all(files.map(({ path, relativePath }) => {
                return readFile(path, relativePath);
            }));
        } else if (filenames) {
            return await Promise.all(filenames.map(path => readFile(path)));
        } else if (filename) {
            return await readFile(filename);
        } else if (directory || multiple) {
            return [];
        } else {
            return null;
        }
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Save a file to the file system.
 * 
 * In the terminal and chromium browsers, this function will open a dialog to
 * let the user choose the location where the file will be saved. In others
 * browsers, the file will be saved to the default download location.
 */
export async function saveFile(file: File, options?: {
    /** Custom the dialog's title. This option is ignored in the browser. */
    title?: string;
}): Promise<void>;
export async function saveFile(
    file: Blob | ArrayBufferLike | ReadableStream<Uint8Array> | Uint8Array,
    options: {
        /** The name of the */
        name: string;
        /** The MIME type of the file. */
        type?: string;
        /** Custom the dialog's title. This option is ignored in the browser. */
        title?: string;
    }
): Promise<void>;
export async function saveFile(
    file: File | Blob | ArrayBufferLike | ReadableStream<Uint8Array> | Uint8Array,
    options: {
        title?: string;
        name?: string;
        type?: string;
    } = {}
): Promise<void> {
    if (typeof (globalThis as any)["showSaveFilePicker"] === "function") {
        const handle = await browserPickFile(options.type, {
            forSave: true,
            defaultName: options.name,
        });

        if (handle) {
            await writeFile(handle, file);
        }
    } else if (isBrowserWindow) {
        const a = document.createElement("a");

        if (file instanceof ReadableStream) {
            const type = options.type || "application/octet-stream";
            a.href = await readAsObjectURL(file, type);
            a.download = options.name || "Unnamed";
        } else if (file instanceof File) {
            a.href = URL.createObjectURL(file);
            a.download = file.name;
        } else if (file instanceof Blob) {
            a.href = URL.createObjectURL(file);
            a.download = options.name || "Unnamed";
        } else {
            const type = options.type || "application/octet-stream";
            const blob = new Blob([file], { type });
            a.href = URL.createObjectURL(blob);
            a.download = options.name || "Unnamed";
        }

        a.click();
    } else if (isDeno || isNodeLike) {
        const { title } = options;
        let stream: ReadableStream<Uint8Array> | undefined;
        let filename: string | null | undefined;

        if (file instanceof ReadableStream) {
            stream = file;
            filename = await pickFile({
                title,
                type: options.type,
                forSave: true,
                defaultName: options.name,
            }) as string | null;
        } else if (file instanceof File) {
            stream = file.stream();
            filename = await pickFile({
                title,
                type: file.type,
                forSave: true,
                defaultName: file.name,
            }) as string | null;
        } else if (file instanceof Blob) {
            stream = file.stream();
            filename = await pickFile({
                title,
                type: options.type || file.type,
                forSave: true,
                defaultName: options.name,
            }) as string | null;
        } else {
            const type = options.type || "application/octet-stream";
            const blob = new Blob([file], { type });
            stream = blob.stream();
            filename = await pickFile({
                title,
                type: options.type,
                forSave: true,
                defaultName: options.name,
            }) as string | null;
        }

        if (filename) {
            if (typeof Deno === "object") {
                await Deno.writeFile(filename, stream, { create: true });
            } else {
                const { createWriteStream } = await import("fs");
                const out = createWriteStream(filename, { flags: "w" });

                for await (const chunk of toAsyncIterable(stream)) {
                    out.write(chunk);
                }

                out.close();
            }
        }
    } else {
        throw new Error("Unsupported runtime");
    }
}
