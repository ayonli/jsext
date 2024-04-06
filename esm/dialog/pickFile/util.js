import { isNode } from '../../parallel/constants.js';
import { text, concat } from '../../bytes.js';
import { basename, extname, join } from '../../path.js';
import readAll from '../../readAll.js';
import { UTIMap } from './constants.js';

const WellKnownPlatforms = [
    "android",
    "darwin",
    "freebsd",
    "linux",
    "netbsd",
    "solaris",
    "windows",
];
function platform() {
    if (typeof Deno === "object") {
        if (WellKnownPlatforms.includes(Deno.build.os)) {
            return Deno.build.os;
        }
        else {
            return "others";
        }
    }
    else if (process.platform === "win32") {
        return "windows";
    }
    else if (process.platform === "sunos") {
        return "solaris";
    }
    else if (WellKnownPlatforms.includes(process.platform)) {
        return process.platform;
    }
    else {
        return "others";
    }
}
async function run(cmd, args) {
    if (typeof Deno === "object") {
        const _cmd = new Deno.Command(cmd, { args });
        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: text(stdout),
            stderr: text(stderr),
        };
    }
    else if (isNode) {
        const { spawn } = await import('child_process');
        const child = spawn(cmd, args);
        const stdout = [];
        const stderr = [];
        child.stdout.on("data", chunk => stdout.push(String(chunk)));
        child.stderr.on("data", chunk => stderr.push(String(chunk)));
        const code = await new Promise((resolve) => {
            child.on("exit", (code, signal) => {
                if (code === null && signal) {
                    resolve(1);
                }
                else {
                    resolve(code !== null && code !== void 0 ? code : 0);
                }
            });
        });
        return {
            code,
            stdout: stdout.join(""),
            stderr: stderr.join(""),
        };
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
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

export { WellKnownPlatforms, createFile, platform, readFile, run };
//# sourceMappingURL=util.js.map
