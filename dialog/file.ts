import { basename, join } from "../path.ts";
import { platform, readFile } from "./terminal/util.ts";
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
import read from "../read.ts";
import readAll from "../readAll.ts";
import { isBrowser } from "../util.ts";

/**
 * Open the file picker dialog and pick a file, this function returns the file's
 * path.
 * 
 * NOTE: this function is not available in the browser.
 */
export async function pickFile(options: {
    /** Custom the dialog's title. */
    title?: string | undefined;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string | undefined;
    /** Open the dialog in save-file mode. */
    save?: boolean;
    /** The default name of the file to save when `save` is set. */
    defaultName?: string | undefined;
} = {}): Promise<string | null> {
    const _platform = platform();

    if (_platform === "darwin") {
        return await macPickFile(options.title, {
            type: options.type,
            save: options?.save,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "linux") {
        return await linuxPickFile(options.title, {
            type: options.type,
            save: options?.save,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "windows") {
        return await windowsPickFile(options.title, {
            type: options.type,
            save: options?.save,
            defaultName: options?.defaultName,
        });
    }

    throw new Error("Unsupported platform or runtime");
}

/**
 * Open the file picker dialog and pick multiple files, this function returns the
 * paths of the files selected.
 * 
 * NOTE: this function is not available in the browser.
 */
export async function pickFiles(options: {
    /** Custom the dialog's title. */
    title?: string;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string;
} = {}): Promise<string[]> {
    const _platform = platform();

    if (_platform === "darwin") {
        return await macPickFiles(options.title, options.type);
    } else if (_platform === "linux") {
        return await linuxPickFiles(options.title, options.type);
    } else if (_platform === "windows") {
        return await windowsPickFiles(options.title, options.type);
    }

    throw new Error("Unsupported platform or runtime");
}

/**
 * Open the file picker dialog and pick a directory, this function returns the
 * directory's path.
 * 
 * NOTE: this function is not available in the browser.
 */
export async function pickDirectory(options: {
    /** Custom the dialog's title. */
    title?: string;
} = {}): Promise<string | null> {
    const _platform = platform();

    if (_platform === "darwin") {
        return await macPickFolder(options.title);
    } else if (_platform === "linux") {
        return await linuxPickFolder(options.title);
    } else if (_platform === "windows") {
        return await windowsPickFolder(options.title);
    }

    throw new Error("Unsupported platform or runtime");
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

    if (isBrowser()) {
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
    } else {
        let filename: string | null | undefined;
        let filenames: string[] | null | undefined;
        let dirname: string | null | undefined;

        if (directory) {
            dirname = await pickDirectory({ title });
        } else if (multiple) {
            filenames = await pickFiles({ title, type });
        } else {
            filename = await pickFile({ title, type });
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
    }
}

/**
 * Save a file to the file system.
 * 
 * In the terminal, this function will open a dialog to let the user choose the
 * location where the file will be saved. In the browser, the file will be saved
 * to the default download location.
 */
export async function saveFile(file: File, options?: {
    /** Custom the dialog's title. This option is ignored in the browser. */
    title?: string;
}): Promise<void>;
export async function saveFile(file: Blob | ReadableStream<Uint8Array> | Uint8Array, options: {
    /** The name of the */
    name: string;
    /** The MIME type of the file. */
    type?: string;
    /** Custom the dialog's title. This option is ignored in the browser. */
    title?: string;
}): Promise<void>;
export async function saveFile(file: File | Blob | ReadableStream<Uint8Array> | Uint8Array, options: {
    title?: string;
    name?: string;
    type?: string;
} = {}): Promise<void> {
    if (isBrowser()) {
        const a = document.createElement("a");

        if (file instanceof ReadableStream) {
            const type = options.type || "application/octet-stream";
            const chunks = await readAll(file);
            const blob = new Blob(chunks, { type });
            a.href = URL.createObjectURL(blob);
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
    } else {
        const { title } = options;
        let stream: ReadableStream<Uint8Array> | undefined;
        let filename: string | null | undefined;

        if (file instanceof ReadableStream) {
            stream = file;
            filename = await pickFile({
                title,
                type: options.type,
                save: true,
                defaultName: options.name,
            });
        } else if (file instanceof File) {
            stream = file.stream();
            filename = await pickFile({
                title,
                type: file.type,
                save: true,
                defaultName: file.name,
            });
        } else if (file instanceof Blob) {
            stream = file.stream();
            filename = await pickFile({
                title,
                type: options.type || file.type,
                save: true,
                defaultName: options.name,
            });
        } else {
            const type = options.type || "application/octet-stream";
            const blob = new Blob([file], { type });
            stream = blob.stream();
            filename = await pickFile({
                title,
                type: options.type,
                save: true,
                defaultName: options.name,
            });
        }

        if (filename) {
            if (typeof Deno === "object") {
                await Deno.writeFile(filename, stream, { create: true });
            } else {
                const { createWriteStream } = await import("fs");
                const out = createWriteStream(filename, { flags: "w" });

                for await (const chunk of read(stream)) {
                    out.write(chunk);
                }

                out.close();
            }
        }
    }
}
