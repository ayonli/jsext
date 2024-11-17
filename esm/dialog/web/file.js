import { getExtensions, getMIME } from '../../filetype.js';
import { readDir } from '../../fs/web.js';
import { fixFileType } from '../../fs/util.js';
import { basename } from '../../path.js';
import { readAsObjectURL } from '../../reader.js';

function htmlAcceptToFileFilters(accept) {
    const groups = [];
    for (const type of accept.split(/\s*,\s*/)) {
        if (type.endsWith("/*")) {
            groups.push(type);
        }
        else {
            const group = groups[groups.length - 1];
            if (!group || typeof group === "string") {
                groups.push([type]);
            }
            else {
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
                }
                else {
                    const mime = getMIME(type) || type;
                    return {
                        description: "",
                        accept: {
                            [mime]: extensions,
                        },
                    };
                }
            });
        }
        else if (group === "*/*") {
            return {
                description: "All Files",
                accept: {
                    "*/*": ["*"],
                }
            };
        }
        else {
            const extensions = getExtensions(group);
            if (!extensions.length) {
                return undefined;
            }
            else if (group === "video/*") {
                return {
                    description: "Video Files",
                    accept: { [group]: extensions },
                };
            }
            else if (group === "audio/*") {
                return {
                    description: "Audio Files",
                    accept: { [group]: extensions },
                };
            }
            else if (group === "image/*") {
                return {
                    description: "Image Files",
                    accept: { [group]: extensions },
                };
            }
            else if (group === "text/*") {
                return {
                    description: "Text Files",
                    accept: { [group]: extensions },
                };
            }
            else {
                const mime = getMIME(group) || group;
                return {
                    description: "",
                    accept: { [mime]: extensions },
                };
            }
        }
    }).flat().filter(item => !!item);
}
async function pickFile(options = {}) {
    const { type } = options;
    try {
        if (options.forSave) {
            return await globalThis["showSaveFilePicker"]({
                types: type ? htmlAcceptToFileFilters(type) : [],
                suggestedName: options.defaultName,
            });
        }
        else {
            const [handle] = await globalThis["showOpenFilePicker"]({
                types: type ? htmlAcceptToFileFilters(type) : [],
            });
            return handle !== null && handle !== void 0 ? handle : null;
        }
    }
    catch (err) {
        if (err.name === "AbortError") {
            return null;
        }
        else {
            throw err;
        }
    }
}
async function pickFiles(options = {}) {
    const { type } = options;
    try {
        return await globalThis["showOpenFilePicker"]({
            types: type ? htmlAcceptToFileFilters(type) : [],
            multiple: true,
        });
    }
    catch (err) {
        if (err.name === "AbortError") {
            return [];
        }
        else {
            throw err;
        }
    }
}
async function pickDirectory() {
    try {
        return await globalThis["showDirectoryPicker"]();
    }
    catch (err) {
        if (err.name === "AbortError") {
            return null;
        }
        else {
            throw err;
        }
    }
}
async function openFile(options = {}) {
    var _a;
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        const handle = await pickFile(options);
        return handle ? await handle.getFile().then(fixFileType) : null;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = (_a = options.type) !== null && _a !== void 0 ? _a : "";
    return await new Promise(resolve => {
        input.onchange = () => {
            var _a;
            const file = (_a = input.files) === null || _a === void 0 ? void 0 : _a[0];
            resolve(file ? fixFileType(file) : null);
        };
        input.oncancel = () => {
            resolve(null);
        };
        if (typeof input.showPicker === "function") {
            input.showPicker();
        }
        else {
            input.click();
        }
    });
}
async function openFiles(options = {}) {
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        const handles = await pickFiles(options);
        const files = [];
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
    return await new Promise(resolve => {
        input.onchange = () => {
            const files = input.files;
            resolve(files ? [...files].map(fixFileType) : []);
        };
        input.oncancel = () => {
            resolve([]);
        };
        if (typeof input.showPicker === "function") {
            input.showPicker();
        }
        else {
            input.click();
        }
    });
}
async function openDirectory() {
    if (typeof globalThis["showDirectoryPicker"] === "function") {
        const dir = await pickDirectory();
        const files = [];
        if (!dir) {
            return files;
        }
        for await (const entry of readDir(dir, { recursive: true })) {
            if (entry.kind === "file") {
                const file = await entry.handle.getFile();
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
    }
    else {
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        return await new Promise(resolve => {
            input.onchange = () => {
                const files = input.files;
                resolve(files ? [...files].map(fixFileType) : []);
            };
            input.oncancel = () => {
                resolve([]);
            };
            if (typeof input.showPicker === "function") {
                input.showPicker();
            }
            else {
                input.click();
            }
        });
    }
}
async function saveFile(file, options = {}) {
    const a = document.createElement("a");
    if (file instanceof ReadableStream) {
        const type = options.type || "application/octet-stream";
        a.href = await readAsObjectURL(file, type);
        a.download = options.name || "Unnamed" + (getExtensions(type)[0] || "");
    }
    else if (file instanceof File) {
        a.href = URL.createObjectURL(file);
        a.download = options.name || file.name || "Unnamed" + (getExtensions(file.type)[0] || "");
    }
    else if (file instanceof Blob) {
        a.href = URL.createObjectURL(file);
        a.download = options.name || "Unnamed" + (getExtensions(file.type)[0] || "");
    }
    else {
        const type = options.type || "application/octet-stream";
        const blob = new Blob([file], { type });
        a.href = URL.createObjectURL(blob);
        a.download = options.name || "Unnamed" + (getExtensions(type)[0] || "");
    }
    a.click();
}
async function downloadFile(url, options = {}) {
    const src = typeof url === "object" ? url.href : url;
    const name = options.name || basename(src);
    const a = document.createElement("a");
    a.href = src;
    a.download = name;
    a.click();
}

export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile };
//# sourceMappingURL=file.js.map
