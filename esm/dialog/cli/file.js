import { asyncTask } from '../../async.js';
import { which } from '../../cli.js';
import { as, pick } from '../../object.js';
import Exception from '../../error/Exception.js';
import { createProgressEvent } from '../../event.js';
import { NotSupportedError } from '../../error/common.js';
import { readFileAsFile, readDir, writeFile } from '../../fs.js';
import { fixFileType } from '../../fs/util.js';
import { join, basename } from '../../path.js';
import { platform } from '../../runtime.js';
import progress from './progress.js';
import { linuxPickFile, linuxPickFiles, linuxPickFolder } from './file/linux.js';
import { macPickFile, macPickFiles, macPickFolder } from './file/mac.js';
import { windowsPickFile, windowsPickFiles, windowsPickFolder } from './file/windows.js';
import { isWSL } from '../../cli/common.js';

async function pickFile(options = {}) {
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
    throw new NotSupportedError("Unsupported platform");
}
async function pickFiles(options = {}) {
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
    throw new NotSupportedError("Unsupported platform");
}
async function pickDirectory(options = {}) {
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
    throw new NotSupportedError("Unsupported platform");
}
async function openFile(options) {
    let filename = await pickFile(options);
    if (filename) {
        return await readFileAsFile(filename);
    }
    else {
        return null;
    }
}
async function openFiles(options = {}) {
    const filenames = await pickFiles(options);
    return await Promise.all(filenames.map(path => readFileAsFile(path)));
}
async function openDirectory(options = {}) {
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
async function saveFile(file, options = {}) {
    var _a;
    const { title } = options;
    let filename;
    if (typeof Blob === "function" && file instanceof Blob) {
        filename = await pickFile({
            title,
            type: options.type || file.type,
            forSave: true,
            defaultName: options.name || ((_a = as(file, File)) === null || _a === void 0 ? void 0 : _a.name),
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
        await writeFile(filename, file, pick(options, ["signal"]));
    }
}
async function downloadFile(url, options = {}) {
    var _a;
    const src = typeof url === "object" ? url.href : url;
    const name = options.name || basename(src);
    const dest = await pickFile({
        title: options.title,
        type: options.type,
        forSave: true,
        defaultName: name,
    });
    if (!dest) // user canceled
        return;
    const task = asyncTask();
    let signal = (_a = options.signal) !== null && _a !== void 0 ? _a : null;
    let result;
    let updateProgress;
    if (options.showProgress) {
        const ctrl = new AbortController();
        signal = ctrl.signal;
        result = progress("Downloading...", async (set) => {
            updateProgress = set;
            return await task;
        }, () => {
            ctrl.abort();
            throw new Exception("Download canceled", { name: "AbortError" });
        });
    }
    else {
        result = task;
    }
    const res = await fetch(src, { signal });
    if (!res.ok) {
        throw new Error(`Failed to download: ${src}`);
    }
    const size = parseInt(res.headers.get("Content-Length") || "0", 10);
    let stream = res.body;
    if (options.onProgress || options.showProgress) {
        const { onProgress } = options;
        let loaded = 0;
        const transform = new TransformStream({
            transform(chunk, controller) {
                controller.enqueue(chunk);
                loaded += chunk.byteLength;
                if (onProgress) {
                    try {
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress(createProgressEvent("progress", {
                            lengthComputable: !!size,
                            loaded,
                            total: size !== null && size !== void 0 ? size : 0,
                        }));
                    }
                    catch (_a) {
                        // ignore
                    }
                }
                if (updateProgress && size) {
                    updateProgress({
                        percent: loaded / size,
                    });
                }
            },
        });
        stream = stream.pipeThrough(transform);
    }
    writeFile(dest, stream, { signal: signal }).then(() => {
        task.resolve();
    }).catch(err => {
        task.reject(err);
    });
    await result;
}

export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile };
//# sourceMappingURL=file.js.map
