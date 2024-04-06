import { basename, join } from '../path.js';
import { platform, readFile } from './terminal/util.js';
import { macPickFile, macPickFiles, macPickFolder } from './pickFile/mac.js';
import { linuxPickFile, linuxPickFiles, linuxPickFolder } from './pickFile/linux.js';
import { windowsPickFile, windowsPickFiles, windowsPickFolder } from './pickFile/windows.js';

/**
 * Open the file picker dialog and pick a file, this function returns the file's
 * path.
 *
 * NOTE: this function is not available in the browser.
 */
function pickFile(options) {
    const _platform = platform();
    if (_platform === "darwin") {
        return macPickFile(options.title, {
            type: options.type,
            save: options === null || options === void 0 ? void 0 : options.save,
            defaultName: options === null || options === void 0 ? void 0 : options.defaultName,
        });
    }
    else if (_platform === "linux") {
        return linuxPickFile(options.title, {
            type: options.type,
            save: options === null || options === void 0 ? void 0 : options.save,
            defaultName: options === null || options === void 0 ? void 0 : options.defaultName,
        });
    }
    else if (_platform === "windows") {
        return windowsPickFile(options.title, {
            type: options.type,
            save: options === null || options === void 0 ? void 0 : options.save,
            defaultName: options === null || options === void 0 ? void 0 : options.defaultName,
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
function pickFiles(options) {
    const _platform = platform();
    if (_platform === "darwin") {
        return macPickFiles(options.title, options.type);
    }
    else if (_platform === "linux") {
        return linuxPickFiles(options.title, options.type);
    }
    else if (_platform === "windows") {
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
function pickDirectory(options) {
    const _platform = platform();
    if (_platform === "darwin") {
        return macPickFolder(options.title);
    }
    else if (_platform === "linux") {
        return linuxPickFolder(options.title);
    }
    else if (_platform === "windows") {
        return windowsPickFolder(options.title);
    }
    return Promise.reject(new Error("Unsupported platform or runtime"));
}
async function openFile(options = {}) {
    const { title = "", type = "", multiple = false, directory = false } = options;
    if (typeof document === "object") {
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
    else {
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
                                relativePath: join(relativePath, entry.name),
                            });
                        }
                        else if (entry.isDirectory) {
                            await walk(join(dirname, entry.name), join(relativePath, entry.name));
                        }
                        else if (entry.isSymlink) {
                            const symlink = await Deno.readLink(join(dirname, entry.name));
                            await walk(symlink, join(relativePath, entry.name));
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
                                relativePath: join(relativePath, entry.name),
                            });
                        }
                        else if (entry.isDirectory()) {
                            await walk(join(dirname, entry.name), join(relativePath, entry.name));
                        }
                        else if (entry.isSymbolicLink()) {
                            const symlink = await readlink(join(dirname, entry.name));
                            await walk(symlink, join(relativePath, entry.name));
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
}

export { openFile, pickDirectory, pickFile, pickFiles };
//# sourceMappingURL=file.js.map
