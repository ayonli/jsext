import { isDeno, isNodeLike, isBrowserWindow } from '../env.js';
import { platform } from '../runtime.js';
import { which } from '../cli.js';
import { readAsObjectURL } from '../reader.js';
import { macPickFile, macPickFiles, macPickFolder } from './terminal/file/mac.js';
import { linuxPickFile, linuxPickFiles, linuxPickFolder } from './terminal/file/linux.js';
import { windowsPickFile, windowsPickFiles, windowsPickFolder } from './terminal/file/windows.js';
import { browserPickFile, browserPickFiles, browserPickFolder } from './terminal/file/browser.js';
import { asyncTask } from '../async.js';
import { concat } from '../bytes.js';
import { getExtensions } from '../filetype.js';
import { readFileAsFile, readDir, writeFile } from '../fs.js';
import { fixFileType } from '../fs/util.js';
import { as } from '../object.js';
import { join, basename } from '../path.js';
import { isWSL } from '../cli/common.js';

/**
 * Opens the file picker dialog and pick a file, this function returns the
 * file's path or a `FileSystemFileHandle` in the browser.
 *
 * NOTE: Browser support is limited to the chromium family.
 */
async function pickFile(options = {}) {
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        return await browserPickFile(options.type, {
            forSave: options.forSave,
            defaultName: options.defaultName,
        });
    }
    else if (isDeno || isNodeLike) {
        const _platform = platform();
        if (_platform === "darwin") {
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
async function pickFiles(options = {}) {
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        return await browserPickFiles(options.type);
    }
    else if (isDeno || isNodeLike) {
        const _platform = platform();
        if (_platform === "darwin") {
            return await macPickFiles(options.title, options.type);
        }
        else if (_platform === "windows" || isWSL()) {
            return await windowsPickFiles(options.title, options.type);
        }
        else if (_platform === "linux" || await which("zenity")) {
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
async function pickDirectory(options = {}) {
    if (typeof globalThis["showDirectoryPicker"] === "function") {
        return await browserPickFolder();
    }
    else if (isDeno || isNodeLike) {
        const _platform = platform();
        if (_platform === "darwin") {
            return await macPickFolder(options.title);
        }
        else if (_platform === "windows" || isWSL()) {
            return await windowsPickFolder(options.title);
        }
        else if (_platform === "linux" || await which("zenity")) {
            return await linuxPickFolder(options.title);
        }
    }
    throw new Error("Unsupported platform");
}
async function openFile(options = {}) {
    const { title = "", type = "", multiple = false, directory = false } = options;
    if (directory) {
        return await openDirectory({ title });
    }
    else if (multiple) {
        return await openFiles({ title, type });
    }
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        const handle = await browserPickFile(type);
        return handle ? await handle.getFile().then(fixFileType) : null;
    }
    else if (isBrowserWindow) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = type !== null && type !== void 0 ? type : "";
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
    else if (isDeno || isNodeLike) {
        let filename = await pickFile({ title, type });
        if (filename) {
            return await readFileAsFile(filename);
        }
        else {
            return null;
        }
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Opens the file picker dialog and selects multiple files to open.
 */
async function openFiles(options = {}) {
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        const handles = await browserPickFiles(options.type);
        const files = [];
        for (const handle of handles) {
            const file = await handle.getFile();
            files.push(fixFileType(file));
        }
        return files;
    }
    else if (isBrowserWindow) {
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
    else if (isDeno || isNodeLike) {
        const filenames = await pickFiles(options);
        return await Promise.all(filenames.map(path => readFileAsFile(path)));
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Opens the directory picker dialog and selects all its files to open.
 */
async function openDirectory(options = {}) {
    if (typeof globalThis["showDirectoryPicker"] === "function") {
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
                    value: entry.relativePath.replace(/\\/g, "/"),
                });
                files.push(fixFileType(file));
            }
        }
        return files;
    }
    else if (isBrowserWindow) {
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
    else if (isDeno || isNodeLike) {
        const dirname = await pickDirectory(options);
        if (dirname) {
            const files = [];
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
        }
        else {
            return [];
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
/**
 * This function wraps the {@link saveFile} function, instead of taking a file
 * object, it takes a URL and downloads the file from the URL.
 */
async function downloadFile(url, options = {}) {
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
        return await saveFile(res.body, { ...options, name });
    }
    else if (isNodeLike) {
        const _url = typeof url === "object" ? url.href : url;
        const task = asyncTask();
        const handleHttpResponse = (res) => {
            if (res.statusCode !== 200) {
                task.reject(new Error(`Failed to download: ${_url}`));
                return;
            }
            else {
                const chunks = [];
                res.on("data", (chunk) => {
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
            const https = await import('https');
            https.get(_url, handleHttpResponse);
        }
        else {
            const http = await import('http');
            http.get(_url, handleHttpResponse);
        }
        return await task;
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile };
//# sourceMappingURL=file.js.map
