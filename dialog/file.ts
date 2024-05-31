import { isBrowserWindow, isDeno, isNodeLike } from "../env.ts";
import { platform } from "../runtime.ts";
import { isWSL, which } from "../cli.ts";
import { readAsObjectURL } from "../reader.ts";
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
import { asyncTask } from "../async.ts";
import { concat } from "../bytes.ts";
import { getExtensions } from "../filetype.ts";
import { readDir, readFileAsFile, writeFile } from "../fs.ts";
import { fixFileType } from "../fs/util.ts";
import { as } from "../object.ts";
import { basename, join } from "../path.ts";

/**
 * Options for file dialog functions, such as {@link pickFile} and
 * {@link openFile}.
 */
export interface FileDialogOptions {
    /**
     * Custom the dialog's title. This option is ignored in the browser.
     */
    title?: string | undefined;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string | undefined;
}

/**
 * Options for the {@link pickFile} function.
 */
export interface PickFileOptions extends FileDialogOptions {
    /** Open the dialog in save mode. */
    forSave?: boolean;
    /** The default name of the file to save when `forSave` is set. */
    defaultName?: string | undefined;
}

/**
 * Opens the file picker dialog and pick a file, this function returns the
 * file's path or a `FileSystemFileHandle` in the browser.
 * 
 * NOTE: Browser support is limited to the chromium family.
 */
export async function pickFile(
    options: PickFileOptions = {}
): Promise<string | FileSystemFileHandle | null> {
    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        return await browserPickFile(options.type, {
            forSave: options.forSave,
            defaultName: options.defaultName,
        });
    } else if (isDeno || isNodeLike) {
        const _platform = platform();

        if (_platform === "darwin") {
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
    }

    throw new Error("Unsupported platform");
}

/**
 * Opens the file picker dialog and pick multiple files, this function returns
 * the paths or `FileSystemFileHandle` objects in the browser of the files
 * selected.
 * 
 * NOTE: Browser support is limited to the chromium family.
 */
export async function pickFiles(
    options: FileDialogOptions = {}
): Promise<string[] | FileSystemFileHandle[]> {
    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        return await browserPickFiles(options.type);
    } else if (isDeno || isNodeLike) {
        const _platform = platform();

        if (_platform === "darwin") {
            return await macPickFiles(options.title, options.type);
        } else if (_platform === "windows" || isWSL()) {
            return await windowsPickFiles(options.title, options.type);
        } else if (_platform === "linux" || await which("zenity")) {
            return await linuxPickFiles(options.title, options.type);
        }
    }

    throw new Error("Unsupported platform");
}

/**
 * Opens the file picker dialog and pick a directory, this function returns the
 * directory's path or `FileSystemDirectoryHandle` in the browser.
 * 
 * NOTE: Browser support is limited to the chromium family.
 */
export async function pickDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<string | FileSystemDirectoryHandle | null> {
    if (typeof (globalThis as any)["showDirectoryPicker"] === "function") {
        return await browserPickFolder();
    } else if (isDeno || isNodeLike) {
        const _platform = platform();

        if (_platform === "darwin") {
            return await macPickFolder(options.title);
        } else if (_platform === "windows" || isWSL()) {
            return await windowsPickFolder(options.title);
        } else if (_platform === "linux" || await which("zenity")) {
            return await linuxPickFolder(options.title);
        }
    }

    throw new Error("Unsupported platform");
}

/**
 * Opens the file picker dialog and selects a file to open.
 */
export function openFile(options?: FileDialogOptions): Promise<File | null>;
/**
 * Opens the file picker dialog and selects multiple files to open.
 * 
 * @deprecated use {@link openFiles} instead.
 */
export function openFile(options: FileDialogOptions & {
    multiple: true;
}): Promise<File[]>;
/**
 * Opens the directory picker dialog and selects all its files.
 * 
 * @deprecated use {@link openDirectory} instead.
 */
export function openFile(options: Pick<FileDialogOptions, "title"> & {
    directory: true;
}): Promise<File[]>;
export async function openFile(options: FileDialogOptions & {
    multiple?: boolean;
    directory?: boolean;
} = {}): Promise<File | File[] | null> {
    const { title = "", type = "", multiple = false, directory = false } = options;

    if (directory) {
        return await openDirectory({ title });
    } else if (multiple) {
        return await openFiles({ title, type });
    }

    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        const handle = await browserPickFile(type);
        return handle ? await handle.getFile().then(fixFileType) : null;
    } else if (isBrowserWindow) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type ?? "";

        return await new Promise<File | File[] | null>(resolve => {
            input.onchange = () => {
                const file = input.files?.[0];
                resolve(file ? fixFileType(file) : null);
            };
            input.oncancel = () => {
                resolve(null);
            };

            if (typeof input.showPicker === "function") {
                input.showPicker();
            } else {
                input.click();
            }
        });
    } else if (isDeno || isNodeLike) {
        let filename = await pickFile({ title, type }) as string | null;

        if (filename) {
            return await readFileAsFile(filename);
        } else {
            return null;
        }
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Opens the file picker dialog and selects multiple files to open.
 */
export async function openFiles(options: FileDialogOptions = {}): Promise<File[]> {
    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        const handles = await browserPickFiles(options.type);
        const files: File[] = [];

        for (const handle of handles) {
            const file = await handle.getFile();
            files.push(fixFileType(file));
        }

        return files;
    } else if (isBrowserWindow) {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = options.type || "";

        return await new Promise<File[]>(resolve => {
            input.onchange = () => {
                const files = input.files;
                resolve(files ? [...files].map(fixFileType) : []);
            };
            input.oncancel = () => {
                resolve([]);
            };

            if (typeof input.showPicker === "function") {
                input.showPicker();
            } else {
                input.click();
            }
        });
    } else if (isDeno || isNodeLike) {
        const filenames = await pickFiles(options) as string[];
        return await Promise.all(filenames.map(path => readFileAsFile(path)));
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Opens the directory picker dialog and selects all its files to open.
 */
export async function openDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<File[]> {
    if (typeof (globalThis as any)["showDirectoryPicker"] === "function") {
        const files: File[] = [];
        const dir = await browserPickFolder();

        if (!dir) {
            return files;
        }

        for await (const entry of readDir(dir, { recursive: true })) {
            if (entry.kind === "file") {
                const file = await (entry.handle as FileSystemFileHandle).getFile();

                Object.defineProperty(file, "webkitRelativePath", {
                    configurable: true,
                    enumerable: true,
                    writable: false,
                    value: entry.relativePath.replace(/\\/g, "/"),
                });

                files.push(fixFileType(file));
            }
        }

        return files;
    } else if (isBrowserWindow) {
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;

        return await new Promise<File[]>(resolve => {
            input.onchange = () => {
                const files = input.files;
                resolve(files ? [...files].map(fixFileType) : []);
            };
            input.oncancel = () => {
                resolve([]);
            };

            if (typeof input.showPicker === "function") {
                input.showPicker();
            } else {
                input.click();
            }
        });
    } else if (isDeno || isNodeLike) {
        const dirname = await pickDirectory(options) as string | null;

        if (dirname) {
            const files: File[] = [];

            for await (const entry of readDir(dirname, { recursive: true })) {
                if (entry.kind === "file") {
                    const path = join(dirname, entry.relativePath);
                    const file = await readFileAsFile(path);

                    Object.defineProperty(file, "webkitRelativePath", {
                        configurable: true,
                        enumerable: true,
                        writable: false,
                        value: entry.relativePath.replace(/\\/g, "/"),
                    });

                    files.push(fixFileType(file));
                }
            }

            return files;
        } else {
            return [];
        }
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Options for the {@link saveFile} function and the {@link downloadFile}
 * function.
 */
export interface SaveFileOptions {
    /**
     * Custom the dialog's title. This option is ignored in the browser.
     */
    title?: string;
    /** The suggested name of the file. */
    name?: string;
    /** The MIME type of the file. */
    type?: string;
}

/**
 * Saves a file to the file system.
 * 
 * In the CLI and chromium browsers, this function will open a dialog to let the
 * user choose the location where the file will be saved. In others browsers,
 * the file will be saved to the default download location.
 */
export async function saveFile(file: File, options?: Pick<SaveFileOptions, "title">): Promise<void>;
export async function saveFile(
    file: Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options?: SaveFileOptions
): Promise<void>;
export async function saveFile(
    file: File | Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options: SaveFileOptions = {}
): Promise<void> {
    if (typeof (globalThis as any)["showSaveFilePicker"] === "function") {
        try {
            const handle = await browserPickFile(options.type, {
                forSave: true,
                defaultName: options.name || as(file, File)?.name,
            });

            if (handle) {
                await writeFile(handle, file);
            }

            return;
        } catch (err) {
            // A `SecurityError` is typically thrown due to lack of user activation.
            // We can ignore this error and fallback to the default download behavior.
            if ((err as DOMException).name !== "SecurityError") {
                throw err;
            }
        }
    }

    if (isBrowserWindow) {
        const a = document.createElement("a");

        if (file instanceof ReadableStream) {
            const type = options.type || "application/octet-stream";
            a.href = await readAsObjectURL(file, type);
            a.download = options.name || "Unnamed" + (getExtensions(type)[0] || "");
        } else if (file instanceof File) {
            a.href = URL.createObjectURL(file);
            a.download = options.name || file.name || "Unnamed" + (getExtensions(file.type)[0] || "");
        } else if (file instanceof Blob) {
            a.href = URL.createObjectURL(file);
            a.download = options.name || "Unnamed" + (getExtensions(file.type)[0] || "");
        } else {
            const type = options.type || "application/octet-stream";
            const blob = new Blob([file], { type });
            a.href = URL.createObjectURL(blob);
            a.download = options.name || "Unnamed" + (getExtensions(type)[0] || "");
        }

        a.click();
    } else if (isDeno || isNodeLike) {
        const { title } = options;
        let filename: string | null | undefined;

        if (typeof Blob === "function" && file instanceof Blob) {
            filename = await pickFile({
                title,
                type: options.type || file.type,
                forSave: true,
                defaultName: options.name || as(file, File)?.name,
            }) as string | null;
        } else {
            filename = await pickFile({
                title,
                type: options.type,
                forSave: true,
                defaultName: options.name,
            }) as string | null;
        }

        if (filename) {
            await writeFile(filename, file);
        }
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * This function wraps the {@link saveFile} function, instead of taking a file
 * object, it takes a URL and downloads the file from the URL.
 */
export async function downloadFile(
    url: string | URL,
    options: SaveFileOptions = {}
): Promise<void> {
    let name = options.name;

    if (!name) {
        const src = typeof url === "object" ? url.href : url;
        name = basename(src);
    }

    if (typeof fetch === "function") {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Failed to download: ${url}`);
        }

        return await saveFile(res.body!, { ...options, name });
    } else if (isNodeLike) {
        const _url = typeof url === "object" ? url.href : url;
        const task = asyncTask<void>();
        const handleHttpResponse = (res: import("http").IncomingMessage) => {
            if (res.statusCode !== 200) {
                task.reject(new Error(`Failed to download: ${_url}`));
                return;
            } else {
                const chunks: Buffer[] = [];

                res.on("data", (chunk: Buffer) => {
                    chunks.push(chunk);
                }).once("end", () => {
                    const buf = concat(...chunks);
                    task.resolve(saveFile(buf.buffer, { ...options, name }));
                }).once("error", err => {
                    task.reject(err);
                });
            }
        };

        if (/https:\/\//i.test(_url)) {
            const https = await import("https");
            https.get(_url, handleHttpResponse);
        } else {
            const http = await import("http");
            http.get(_url, handleHttpResponse);
        }

        return await task;
    } else {
        throw new Error("Unsupported runtime");
    }
}
