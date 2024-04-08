import { isWide, isFullWidth } from '../../external/code-point-utils/index.js';
import bytes, { equals, text, concat } from '../../bytes.js';
import { sum } from '../../math.js';
import { chars, byteLength } from '../../string.js';
import { ESC, CANCEL, UTIMap, EMOJI_RE } from './constants.js';
import { basename, extname } from '../../path.js';
import readAll from '../../readAll.js';

function charWidth(char) {
    if (EMOJI_RE.test(char)) {
        const _bytes = byteLength(char);
        // Most emojis are 4 bytes wide, but some are 3 bytes in Windows/Linux,
        // and 6 bytes in macOS.
        return _bytes === 3 || _bytes === 6 ? 1 : 2;
    }
    else if (isWide(char.codePointAt(0)) || isFullWidth(char.codePointAt(0))) {
        return 2;
    }
    else {
        return 1;
    }
}
function strWidth(str) {
    return sum(...chars(str).map(charWidth));
}
function toLeft(str) {
    return bytes(`\u001b[${strWidth(str)}D`);
}
function toRight(str) {
    return bytes(`\u001b[${strWidth(str)}C`);
}
async function read(stdin) {
    if ("fd" in stdin) {
        return new Promise(resolve => {
            const listener = (chunk) => {
                stdin.removeListener("data", listener);
                resolve(bytes(chunk));
            };
            stdin.on("data", listener);
        });
    }
    else {
        const reader = stdin.readable.getReader();
        const { done, value } = await reader.read();
        reader.releaseLock();
        if (done) {
            return bytes([]);
        }
        else {
            return bytes(value);
        }
    }
}
async function write(stdout, data) {
    if ("fd" in stdout) {
        await new Promise(resolve => {
            stdout.write(data, () => resolve());
        });
    }
    else {
        await stdout.write(data);
    }
}
function writeSync(stdout, data) {
    if ("fd" in stdout) {
        write(stdout, data);
    }
    else {
        stdout.writeSync(data);
    }
}
function isCancelEvent(buf) {
    return equals(buf, ESC) || equals(buf, CANCEL);
}
async function hijackNodeStdin(stdin, task) {
    if (stdin.isPaused()) {
        stdin.resume();
    }
    const listeners = [...stdin.listeners("data")]; // copy listeners in cased being modified
    if (listeners === null || listeners === void 0 ? void 0 : listeners.length) {
        stdin.removeAllListeners("data");
    }
    try {
        return await task();
    }
    finally {
        if (listeners === null || listeners === void 0 ? void 0 : listeners.length) {
            listeners.forEach(listener => stdin.addListener("data", listener));
        }
        else {
            stdin.pause();
        }
    }
}
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
function escape(str) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
async function run(cmd, args) {
    var _a;
    if (typeof Deno === "object") {
        const _cmd = new Deno.Command(cmd, { args });
        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: text(stdout),
            stderr: text(stderr),
        };
    }
    else if (typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node)) {
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
async function which(cmd) {
    if (platform() === "windows") {
        const { code, stdout } = await run("powershell", [
            "-Command",
            `Get-Command -Name ${cmd} | Select-Object -ExpandProperty Source`
        ]);
        return code ? null : stdout.trim();
    }
    else {
        const { code, stdout } = await run("which", [cmd]);
        return code ? null : stdout.trim();
    }
}
function createFile(content, path, options) {
    var _a, _b;
    const { lastModified, relativePath } = options;
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
        value: relativePath !== null && relativePath !== void 0 ? relativePath : "",
    });
    return file;
}
async function readFile(path, relativePath = "") {
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
    return createFile(content, path, { relativePath, lastModified });
}

export { WellKnownPlatforms, createFile, escape, hijackNodeStdin, isCancelEvent, platform, read, readFile, run, toLeft, toRight, which, write, writeSync };
//# sourceMappingURL=util.js.map
