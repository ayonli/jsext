import { basename, extname } from '../../../path.js';
import { getMIME } from '../../../filetype.js';

function createFileObject(content, path, options) {
    var _a;
    const { lastModified, relativePath } = options;
    const filename = basename(path);
    const type = (_a = getMIME(extname(filename))) !== null && _a !== void 0 ? _a : "";
    let file;
    if (lastModified) {
        file = new File([content], filename, { type, lastModified });
    }
    else {
        file = new File([content], path, { type });
    }
    Object.defineProperty(file, "webkitRelativePath", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: relativePath !== null && relativePath !== void 0 ? relativePath : "",
    });
    return file;
}
async function readFile(path, relativePath = "") {
    let content;
    let lastModified;
    if (typeof Deno === "object") {
        const stats = await Deno.stat(path);
        content = await Deno.readFile(path);
        lastModified = stats.mtime ? stats.mtime.valueOf() : 0;
    }
    else {
        const { readFile, stat } = await import('fs/promises');
        const stats = await stat(path);
        content = await readFile(path);
        lastModified = stats.mtimeMs;
    }
    return createFileObject(content, path, { relativePath, lastModified });
}

export { createFileObject, readFile };
//# sourceMappingURL=util.js.map
