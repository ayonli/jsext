import { basename, join } from "../path.ts";
import { platform, readFile } from "./terminal/util.ts";
import {
    macPickFolder,
    macPickFiles,
    macPickFile,
} from "./pickFile/mac.ts";
import {
    linuxPickFolder,
    linuxPickFiles,
    linuxPickFile,
} from "./pickFile/linux.ts";
import {
    windowsPickFolder,
    windowsPickFiles,
    windowsPickFile,
} from "./pickFile/windows.ts";

/**
 * Open the file picker dialog and pick a file, this function returns the file's
 * path.
 * 
 * NOTE: this function is not available in the browser.
 */
export function pickFile(options: {
    /** Custom the dialog's title. */
    title?: string;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string;
    /** Open the dialog in save-file mode. */
    save?: boolean;
    /** The default name of the file to save when `save` is set. */
    defaultName?: string;
}): Promise<string | null> {
    const _platform = platform();

    if (_platform === "darwin") {
        return macPickFile(options.title, {
            type: options.type,
            save: options?.save,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "linux") {
        return linuxPickFile(options.title, {
            type: options.type,
            save: options?.save,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "windows") {
        return windowsPickFile(options.title, {
            type: options.type,
            save: options?.save,
            defaultName: options?.defaultName,
        });
    }

    return Promise.reject(new Error("Unsupported platform or runtime"));
}

/**
 * Open the file picker dialog and pick multiple files, this function returns the
 * paths of the files selected.
 * 
 * NOTE: this function is not available in the browser.
 */
export function pickFiles(options: {
    /** Custom the dialog's title. */
    title?: string;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string;
}): Promise<string[]> {
    const _platform = platform();

    if (_platform === "darwin") {
        return macPickFiles(options.title, options.type);
    } else if (_platform === "linux") {
        return linuxPickFiles(options.title, options.type);
    } else if (_platform === "windows") {
        return windowsPickFiles(options.title, options.type);
    }

    return Promise.reject(new Error("Unsupported platform or runtime"));
}

/**
 * Open the file picker dialog and pick a directory, this function returns the
 * directory's path.
 * 
 * NOTE: this function is not available in the browser.
 */
export function pickDirectory(options: {
    title?: string;
}): Promise<string | null> {
    const _platform = platform();

    if (_platform === "darwin") {
        return macPickFolder(options.title);
    } else if (_platform === "linux") {
        return linuxPickFolder(options.title);
    } else if (_platform === "windows") {
        return windowsPickFolder(options.title);
    }

    return Promise.reject(new Error("Unsupported platform or runtime"));
}

/** Open the file picker dialog and pick a file to open. */
export function openFile(options: {
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
    multiple: boolean;
}): Promise<File[]>;
/** Open the file picker dialog and pick a directory to open. */
export function openFile(options: {
    title?: string;
    directory: boolean;
}): Promise<File[]>;
export async function openFile(options: {
    title?: string;
    type?: string;
    multiple?: boolean;
    directory?: boolean;
} = {}): Promise<File | File[] | null> {
    const { title = "", type = "", multiple = false, directory = false } = options;

    if (typeof document === "object") {
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
                                relativePath: join(relativePath, entry.name),
                            });
                        } else if (entry.isDirectory) {
                            await walk(join(dirname, entry.name), join(relativePath, entry.name));
                        } else if (entry.isSymlink) {
                            const symlink = await Deno.readLink(join(dirname, entry.name));
                            await walk(symlink, join(relativePath, entry.name));
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
                                relativePath: join(relativePath, entry.name),
                            });
                        } else if (entry.isDirectory()) {
                            await walk(join(dirname, entry.name), join(relativePath, entry.name));
                        } else if (entry.isSymbolicLink()) {
                            const symlink = await readlink(join(dirname, entry.name));
                            await walk(symlink, join(relativePath, entry.name));
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
