import { getExtensions } from "@ayonli/jsext/filetype";

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
                return {
                    description: "",
                    accept: {
                        [type]: getExtensions(type),
                    },
                };
            }).flat();
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
                    accept: extensions,
                };
            } else if (group === "audio/*") {
                return {
                    description: "Audio Files",
                    accept: extensions,
                };
            } else if (group === "image/*") {
                return {
                    description: "Image Files",
                    accept: extensions,
                };
            } else if (group === "text/*") {
                return {
                    description: "Text Files",
                    accept: extensions,
                };
            } else {
                return {
                    description: "",
                    accept: extensions,
                };
            }
        }
    }).filter(Boolean) as {
        description: string;
        accept: {
            [mime: string]: string[];
        };
    }[];
}

export async function browserPickFile(type: string = "", options: {
    forSave?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): Promise<FileSystemFileHandle | null> {
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

export async function browserPickFiles(type: string = ""): Promise<FileSystemFileHandle[]> {
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

export async function browserPickFolder(): Promise<FileSystemDirectoryHandle | null> {
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
