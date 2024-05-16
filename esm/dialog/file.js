import { isBrowserWindow, isDeno, isNodeLike } from '../env.js';
import { platform } from '../runtime.js';
import { which } from '../cli.js';
import { readAsObjectURL } from '../reader.js';
import { macPickFile, macPickFiles, macPickFolder } from './terminal/file/mac.js';
import { linuxPickFile, linuxPickFiles, linuxPickFolder } from './terminal/file/linux.js';
import { windowsPickFile, windowsPickFiles, windowsPickFolder } from './terminal/file/windows.js';
import { browserPickFile, browserPickFiles, browserPickFolder } from './terminal/file/browser.js';
import { getMIME, getExtensions } from '../filetype.js';
import { readDir, readFileAsFile, writeFile } from '../fs.js';
import { extname } from '../path.js';
import { as } from '../object.js';
import { isWSL } from '../cli/common.js';

/**
 * Open the file picker dialog and pick a file, this function returns the file's
 * path or a `FileSystemFileHandle` in the browser.
 *
 * NOTE: Browser support is limited to the chromium family.
 */
async function pickFile(options = {}) {
    const _platform = platform();
    // @ts-ignore for history compatibility
    if (options["save"]) {
        options.forSave = true;
    }
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        return await browserPickFile(options.type, {
            forSave: options.forSave,
            defaultName: options.defaultName,
        });
    }
    else if (_platform === "darwin") {
        return await macPickFile(options.title, {
            type: options.type,
            forSave: options === null || options === void 0 ? void 0 : options.forSave,
            defaultName: options === null || options === void 0 ? void 0 : options.defaultName,
        });
    }
    else if (_platform === "windows" || isWSL()) {
        return await windowsPickFile(options.title, {
            type: options.type,
            forSave: options === null || options === void 0 ? void 0 : options.forSave,
            defaultName: options === null || options === void 0 ? void 0 : options.defaultName,
        });
    }
    else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFile(options.title, {
            type: options.type,
            forSave: options === null || options === void 0 ? void 0 : options.forSave,
            defaultName: options === null || options === void 0 ? void 0 : options.defaultName,
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
async function pickFiles(options = {}) {
    const _platform = platform();
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        return await browserPickFiles(options.type);
    }
    else if (_platform === "darwin") {
        return await macPickFiles(options.title, options.type);
    }
    else if (_platform === "windows" || isWSL()) {
        return await windowsPickFiles(options.title, options.type);
    }
    else if (_platform === "linux" || await which("zenity")) {
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
async function pickDirectory(options = {}) {
    const _platform = platform();
    if (typeof globalThis["showDirectoryPicker"] === "function") {
        return await browserPickFolder();
    }
    else if (_platform === "darwin") {
        return await macPickFolder(options.title);
    }
    else if (_platform === "windows" || isWSL()) {
        return await windowsPickFolder(options.title);
    }
    else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFolder(options.title);
    }
    throw new Error("Unsupported platform");
}
async function openFile(options = {}) {
    var _a, _b, _c;
    const { title = "", type = "", multiple = false, directory = false } = options;
    if (directory && typeof globalThis["showDirectoryPicker"] === "function") {
        const files = [];
        const dir = await browserPickFolder();
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
                    value: (_a = entry.path) !== null && _a !== void 0 ? _a : "",
                });
                if (!file.type) {
                    const ext = extname(file.name);
                    if (ext) {
                        Object.defineProperty(file, "type", {
                            value: (_b = getMIME(ext)) !== null && _b !== void 0 ? _b : "",
                            writable: false,
                            configurable: true,
                        });
                    }
                }
                files.push(file);
            }
        }
        return files;
    }
    else if (typeof globalThis["showOpenFilePicker"] === "function") {
        if (multiple) {
            const handles = await browserPickFiles(type);
            const files = [];
            for (const handle of handles) {
                const file = await handle.getFile();
                files.push(file);
            }
            return files;
        }
        else {
            const handle = await browserPickFile(type);
            return handle ? await handle.getFile() : null;
        }
    }
    else if (isBrowserWindow) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type !== null && type !== void 0 ? type : "";
        input.multiple = multiple !== null && multiple !== void 0 ? multiple : false;
        input.webkitdirectory = directory !== null && directory !== void 0 ? directory : false;
        return await new Promise(resolve => {
            input.onchange = () => {
                var _a;
                const files = input.files;
                if (directory || multiple) {
                    resolve(files ? [...files] : []);
                }
                else {
                    resolve(files ? ((_a = files[0]) !== null && _a !== void 0 ? _a : null) : null);
                }
            };
            input.oncancel = () => {
                if (directory || multiple) {
                    resolve([]);
                }
                else {
                    resolve(null);
                }
            };
            if (typeof input.showPicker === "function") {
                input.showPicker();
            }
            else {
                input.click();
            }
        });
    }
    else if (isDeno || isNodeLike) {
        let filename;
        let filenames;
        let dirname;
        if (directory) {
            dirname = await pickDirectory({ title });
        }
        else if (multiple) {
            filenames = await pickFiles({ title, type });
        }
        else {
            filename = await pickFile({ title, type });
        }
        if (dirname) {
            const files = [];
            for await (const entry of readDir(dirname, { recursive: true })) {
                if (entry.kind === "file") {
                    const file = await entry.handle.getFile();
                    Object.defineProperty(file, "webkitRelativePath", {
                        configurable: true,
                        enumerable: true,
                        writable: false,
                        value: (_c = entry.path) !== null && _c !== void 0 ? _c : "",
                    });
                    files.push(file);
                }
            }
            return files;
        }
        else if (filenames) {
            return await Promise.all(filenames.map(path => readFileAsFile(path)));
        }
        else if (filename) {
            return await readFileAsFile(filename);
        }
        else if (directory || multiple) {
            return [];
        }
        else {
            return null;
        }
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
async function saveFile(file, options = {}) {
    var _a, _b;
    if (typeof globalThis["showSaveFilePicker"] === "function") {
        try {
            const handle = await browserPickFile(options.type, {
                forSave: true,
                defaultName: options.name || ((_a = as(file, File)) === null || _a === void 0 ? void 0 : _a.name),
            });
            if (handle) {
                await writeFile(handle, file);
            }
            return;
        }
        catch (err) {
            // A `SecurityError` is typically thrown due to lack of user activation.
            // We can ignore this error and fallback to the default download behavior.
            if (err.name !== "SecurityError") {
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
    else if (isDeno || isNodeLike) {
        const { title } = options;
        let filename;
        if (typeof Blob === "function" && file instanceof Blob) {
            filename = await pickFile({
                title,
                type: options.type || file.type,
                forSave: true,
                defaultName: options.name || ((_b = as(file, File)) === null || _b === void 0 ? void 0 : _b.name),
            });
        }
        else {
            filename = await pickFile({
                title,
                type: options.type,
                forSave: true,
                defaultName: options.name,
            });
        }
        if (filename) {
            await writeFile(filename, file);
        }
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { openFile, pickDirectory, pickFile, pickFiles, saveFile };
//# sourceMappingURL=file.js.map
