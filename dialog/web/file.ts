import { getExtensions, getMIME } from "../../filetype.ts";
import { readDir } from "../../fs/web.ts";
import { fixFileType } from "../../fs/util.ts";
import { basename } from "../../path.ts";
import { readAsObjectURL } from "../../reader.ts";
import type { DownloadFileOptions, FileDialogOptions, PickFileOptions, SaveFileOptions } from "../file.ts";

function htmlAcceptToFileFilters(accept: string): {
    description: string;
    accept: {
        [mime: string]: string[];
    };
}[] {
    const groups: (string | string[])[] = [];

    for (const type of accept.split(/\s*,\s*/)) {
        if (type.endsWith("/*")) {
            groups.push(type);
        } else {
            const group = groups[groups.length - 1];

            if (!group || typeof group === "string") {
                groups.push([type]);
            } else {
                group.push(type);
            }
        }
    }

    return groups.map(group => {
        if (Array.isArray(group)) {
            return group.map(type => {
                const extensions = getExtensions(type);

                if (!extensions.length) {
                    return undefined;
                } else {
                    const mime = getMIME(type) || type;
                    return {
                        description: "",
                        accept: {
                            [mime]: extensions,
                        },
                    };
                }
            });
        } else if (group === "*/*") {
            return {
                description: "All Files",
                accept: {
                    "*/*": ["*"],
                }
            };
        } else {
            const extensions = getExtensions(group);

            if (!extensions.length) {
                return undefined;
            } else if (group === "video/*") {
                return {
                    description: "Video Files",
                    accept: { [group]: extensions },
                };
            } else if (group === "audio/*") {
                return {
                    description: "Audio Files",
                    accept: { [group]: extensions },
                };
            } else if (group === "image/*") {
                return {
                    description: "Image Files",
                    accept: { [group]: extensions },
                };
            } else if (group === "text/*") {
                return {
                    description: "Text Files",
                    accept: { [group]: extensions },
                };
            } else {
                const mime = getMIME(group) || group;
                return {
                    description: "",
                    accept: { [mime]: extensions },
                };
            }
        }
    }).flat().filter(item => !!item) as {
        description: string;
        accept: {
            [mime: string]: string[];
        };
    }[];
}

export async function pickFile(options: PickFileOptions = {}): Promise<FileSystemFileHandle | null> {
    const { type } = options;

    try {
        if (options.forSave) {
            return await (globalThis as any)["showSaveFilePicker"]({
                types: type ? htmlAcceptToFileFilters(type) : [],
                suggestedName: options.defaultName,
            });
        } else {
            const [handle] = await (globalThis as any)["showOpenFilePicker"]({
                types: type ? htmlAcceptToFileFilters(type) : [],
            });
            return handle ?? null;
        }
    } catch (err) {
        if ((err as DOMException).name === "AbortError") {
            return null;
        } else {
            throw err;
        }
    }
}

export async function pickFiles(options: FileDialogOptions = {}): Promise<FileSystemFileHandle[]> {
    const { type } = options;

    try {
        return await (globalThis as any)["showOpenFilePicker"]({
            types: type ? htmlAcceptToFileFilters(type) : [],
            multiple: true,
        });
    } catch (err) {
        if ((err as DOMException).name === "AbortError") {
            return [];
        } else {
            throw err;
        }
    }
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
    try {
        return await (globalThis as any)["showDirectoryPicker"]();
    } catch (err) {
        if ((err as DOMException).name === "AbortError") {
            return null;
        } else {
            throw err;
        }
    }
}

export async function openFile(options: FileDialogOptions = {}): Promise<File | null> {
    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        const handle = await pickFile(options);
        return handle ? await handle.getFile().then(fixFileType) : null;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = options.type ?? "";

    return await new Promise<File | null>(resolve => {
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
}

export async function openFiles(options: FileDialogOptions = {}): Promise<File[]> {
    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        const handles = await pickFiles(options);
        const files: File[] = [];

        for (const handle of handles) {
            const file = await handle.getFile();
            files.push(fixFileType(file));
        }

        return files;
    }

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
}

export async function openDirectory(): Promise<File[]> {
    if (typeof (globalThis as any)["showDirectoryPicker"] === "function") {
        const dir = await pickDirectory();
        const files: File[] = [];

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
    } else {
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
    }
}

export async function saveFile(
    file: File | Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options: SaveFileOptions = {}
): Promise<void> {
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
}

export async function downloadFile(
    url: string | URL,
    options: DownloadFileOptions = {}
): Promise<void> {
    const src = typeof url === "object" ? url.href : url;
    const name = options.name || basename(src);
    const a = document.createElement("a");

    a.href = src;
    a.download = name;
    a.click();
}
