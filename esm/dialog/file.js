import { join, basename } from '../path.js';
import { isBrowserWindow, isDeno, isNodeLike } from '../env.js';
import { platform } from '../runtime.js';
import { which } from '../cli.js';
import { readAsObjectURL } from '../reader.js';
import { readFile } from './terminal/util.js';
import { macPickFile, macPickFiles, macPickFolder } from './terminal/file/mac.js';
import { linuxPickFile, linuxPickFiles, linuxPickFolder } from './terminal/file/linux.js';
import { windowsPickFile, windowsPickFiles, windowsPickFolder } from './terminal/file/windows.js';
import { browserPickFile, browserPickFiles, browserPickFolder } from './terminal/file/browser.js';
import { writeFile } from '../fs.js';
import { as } from '../object.js';
import { toAsyncIterable } from '../reader/util.js';
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
    const { title = "", type = "", multiple = false, directory = false } = options;
    if (directory && typeof globalThis["showDirectoryPicker"] === "function") {
        const files = [];
        const dir = await browserPickFolder();
        if (!dir) {
            return files;
        }
        await (async function walk(dir, base = "") {
            const entries = dir.entries();
            for await (const [_, entry] of entries) {
                const path = join(base, entry.name);
                if (entry.kind === "file") {
                    const file = await entry.getFile();
                    Object.defineProperty(file, "webkitRelativePath", {
                        configurable: true,
                        enumerable: true,
                        writable: false,
                        value: path !== null && path !== void 0 ? path : "",
                    });
                    files.push(file);
                }
                else {
                    await walk(entry, path);
                }
            }
        })(dir);
        return files;
    }
    else if (typeof globalThis["showOpenPicker"] === "function") {
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
            input.click();
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
            const folder = basename(dirname);
            const files = [];
            if (typeof Deno === "object") {
                await (async function walk(dirname, relativePath = "") {
                    for await (const entry of Deno.readDir(dirname)) {
                        if (entry.isFile) {
                            files.push({
                                path: join(dirname, entry.name),
                                relativePath: relativePath + "/" + entry.name,
                            });
                        }
                        else if (entry.isDirectory) {
                            await walk(join(dirname, entry.name), relativePath + "/" + entry.name);
                        }
                        else if (entry.isSymlink) {
                            const symlink = await Deno.readLink(join(dirname, entry.name));
                            await walk(symlink, relativePath + "/" + entry.name);
                        }
                    }
                })(dirname, folder);
            }
            else {
                const { readdir, readlink } = await import('fs/promises');
                await (async function walk(dirname, relativePath = "") {
                    const entries = await readdir(dirname, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isFile()) {
                            files.push({
                                path: join(dirname, entry.name),
                                relativePath: relativePath + "/" + entry.name,
                            });
                        }
                        else if (entry.isDirectory()) {
                            await walk(join(dirname, entry.name), relativePath + "/" + entry.name);
                        }
                        else if (entry.isSymbolicLink()) {
                            const symlink = await readlink(join(dirname, entry.name));
                            await walk(symlink, relativePath + "/" + entry.name);
                        }
                    }
                })(dirname, folder);
            }
            return await Promise.all(files.map(({ path, relativePath }) => {
                return readFile(path, relativePath);
            }));
        }
        else if (filenames) {
            return await Promise.all(filenames.map(path => readFile(path)));
        }
        else if (filename) {
            return await readFile(filename);
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
    var _a;
    if (typeof globalThis["showSaveFilePicker"] === "function") {
        const handle = await browserPickFile(options.type, {
            forSave: true,
            defaultName: options.name || ((_a = as(file, Blob)) === null || _a === void 0 ? void 0 : _a.name),
        });
        if (handle) {
            await writeFile(handle, file);
        }
    }
    else if (isBrowserWindow) {
        const a = document.createElement("a");
        if (file instanceof ReadableStream) {
            const type = options.type || "application/octet-stream";
            a.href = await readAsObjectURL(file, type);
            a.download = options.name || "Unnamed";
        }
        else if (file instanceof File) {
            a.href = URL.createObjectURL(file);
            a.download = options.name || file.name || "Unnamed";
        }
        else if (file instanceof Blob) {
            a.href = URL.createObjectURL(file);
            a.download = options.name || "Unnamed";
        }
        else {
            const type = options.type || "application/octet-stream";
            const blob = new Blob([file], { type });
            a.href = URL.createObjectURL(blob);
            a.download = options.name || "Unnamed";
        }
        a.click();
    }
    else if (isDeno || isNodeLike) {
        const { title } = options;
        let stream;
        let filename;
        if (typeof ReadableStream === "function" && file instanceof ReadableStream) {
            stream = file;
            filename = await pickFile({
                title,
                type: options.type,
                forSave: true,
                defaultName: options.name,
            });
        }
        else if (typeof File === "function" && file instanceof File) {
            stream = file.stream();
            filename = await pickFile({
                title,
                type: file.type,
                forSave: true,
                defaultName: options.name || file.name,
            });
        }
        else if (typeof Blob === "function" && file instanceof Blob) {
            stream = file.stream();
            filename = await pickFile({
                title,
                type: options.type || file.type,
                forSave: true,
                defaultName: options.name,
            });
        }
        else {
            const type = options.type || "application/octet-stream";
            const blob = new Blob([file], { type });
            stream = blob.stream();
            filename = await pickFile({
                title,
                type: options.type,
                forSave: true,
                defaultName: options.name,
            });
        }
        if (filename) {
            if (typeof Deno === "object") {
                await Deno.writeFile(filename, stream, { create: true });
            }
            else {
                const { createWriteStream } = await import('fs');
                const out = createWriteStream(filename, { flags: "w" });
                for await (const chunk of toAsyncIterable(stream)) {
                    out.write(chunk);
                }
                out.close();
            }
        }
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { openFile, pickDirectory, pickFile, pickFiles, saveFile };
//# sourceMappingURL=file.js.map
