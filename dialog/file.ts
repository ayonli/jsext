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
import { join } from "../path.ts";

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
    } else if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        if (multiple) {
            const handles = await browserPickFiles(type);
            const files: File[] = [];

            for (const handle of handles) {
                const file = await handle.getFile();
                files.push(fixFileType(file));
            }

            return files;
        } else {
            const handle = await browserPickFile(type);
            return handle ? await handle.getFile().then(fixFileType) : null;
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

            if (typeof input.showPicker === "function") {
                input.showPicker();
            } else {
                input.click();
            }
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
        } else if (filenames) {
            return await Promise.all(filenames.map(path => readFileAsFile(path)));
        } else if (filename) {
            return await readFileAsFile(filename);
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
    file: Blob | DataView | ReadableStream<Uint8Array> | Uint8Array | ArrayBuffer,
    options: {
        /** The suggested name of the file. */
        name?: string;
        /** The MIME type of the file. */
        type?: string;
        /** Custom the dialog's title. This option is ignored in the browser. */
        title?: string;
    }
): Promise<void>;
export async function saveFile(
    file: File | Blob | DataView | ReadableStream<Uint8Array> | Uint8Array | ArrayBuffer,
    options: {
        title?: string;
        name?: string;
        type?: string;
    } = {}
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
export async function downloadFile(url: string | URL, options: {
    title?: string;
    name?: string;
    type?: string;
} = {}): Promise<void> {
    if (typeof fetch === "function") {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Failed to download: ${url}`);
        }

        return await saveFile(res.body!, options);
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
                    task.resolve(saveFile(buf.buffer, options));
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
