import { concat } from '../../bytes.js';
import { basename, extname, join } from '../../path.js';
import readAll from '../../readAll.js';
import { UTIMap } from './constants.js';

function createFile(content, path, options) {
    var _a, _b;
    const { lastModified, folder } = options;
    const tagsList = Object.values(UTIMap);
    const filename = basename(path);
    const ext = extname(filename).toLowerCase();
    const type = (_b = (_a = tagsList.find(tags => tags.includes(ext))) === null || _a === void 0 ? void 0 : _a.find(tag => tag.includes("/"))) !== null && _b !== void 0 ? _b : "";
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
        value: folder ? join(folder, file.name) : "",
    });
    return file;
}
async function readFile(path, folder = "") {
    let content;
    let lastModified;
    if (typeof Deno === "object") {
        const fsFile = await Deno.open(path);
        const stats = await fsFile.stat();
        content = concat(...(await readAll(fsFile.readable)));
        lastModified = stats.mtime ? stats.mtime.valueOf() : 0;
    }
    else {
        const { readFile, stat } = await import('fs/promises');
        const stats = await stat(path);
        content = await readFile(path);
        lastModified = stats.mtimeMs;
    }
    return createFile(content, path, { folder, lastModified });
}

export { createFile, readFile };
//# sourceMappingURL=util.js.map
