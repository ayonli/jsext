import { text } from './bytes.js';
import { interop } from './module.js';
import { PowerShellCommands } from './cli/constants.js';
import { isDeno, isBun } from './env.js';

/**
 * Useful utility functions for interacting with the terminal.
 *
 * NOTE: this module is not intended to be used in the browser.
 * @module
 * @experimental
 */
const PopularPlatforms = [
    "android",
    "darwin",
    "freebsd",
    "linux",
    "windows",
];
/**
 * Returns a string identifying the operating system platform in which the
 * program is running.
 */
function platform() {
    if (typeof Deno === "object") {
        if (PopularPlatforms.includes(Deno.build.os)) {
            return Deno.build.os;
        }
        else {
            return "others";
        }
    }
    else if (typeof process === "object" && typeof process.platform === "string") {
        if (process.platform === "win32") {
            return "windows";
        }
        else if (PopularPlatforms.includes(process.platform)) {
            return process.platform;
        }
        else {
            return "others";
        }
    }
    else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Android")) {
            return "android";
        }
        else if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        }
        else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        }
        else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        }
        else {
            return "others";
        }
    }
    else {
        return "others";
    }
}
/** Checks if the program is running in Windows Subsystem for Linux. */
function isWSL() {
    if (platform() !== "linux")
        return false;
    if (typeof Deno === "object") {
        return Deno.osRelease().includes("microsoft-standard-WSL");
    }
    else if (typeof process === "object" && typeof process.env === "object") {
        return !!process.env["WSL_INTEROP"];
    }
    return false;
}
/** Checks if the program is running in a TypeScript runtime. */
function isTsRuntime() {
    var _a;
    if (isDeno || isBun) {
        return true;
    }
    else if (typeof process !== "object") {
        return false;
    }
    return process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
        || /\.tsx?$|\bvite\b/.test((_a = process.argv[1]) !== null && _a !== void 0 ? _a : "");
}
function parseValue(arg) {
    let value = arg.trim();
    if (value === "true") {
        value = true;
    }
    else if (value === "false") {
        value = false;
    }
    else if (/^\d+(\.\d+)?$/.test(value)) {
        value = Number(value);
    }
    return value;
}
function parseKeyValue(arg, noCoercion = false) {
    let index = arg.indexOf("=");
    if (index === -1) {
        return [arg, undefined];
    }
    else {
        const key = arg.slice(0, index);
        const value = arg.slice(index + 1);
        if (noCoercion === true || (Array.isArray(noCoercion) && noCoercion.includes(key))) {
            return [key, value];
        }
        else {
            return [key, parseValue(value)];
        }
    }
}
/**
 * Parses the given CLI arguments into an object.
 *
 * @example
 * ```ts
 * import { parseArgs } from "@ayonli/jsext/cli";
 *
 * const args = parseArgs([
 *     "Bob",
 *     "--age", "30",
 *     "--married",
 *     "--wife=Alice",
 *     "--children", "Mia",
 *     "--children", "Ava",
 *     "-p"
 * ], {
 *     alias: { "p": "has-parents" },
 *     lists: ["children"],
 * });
 *
 * console.log(args);
 * // {
 * //     "0": "Bob",
 * //     age: 30,
 * //     married: true,
 * //     wife: "Alice",
 * //     children: ["Mia", "Ava"],
 * //     "has-parents": true
 * // }
 * ```
 */
function parseArgs(args, options = {}) {
    var _a;
    const { alias: alias = {}, lists = [], noCoercion = false } = options;
    const result = {};
    let key = null;
    let index = 0;
    const set = (key, value) => {
        var _a;
        if (lists.includes(key)) {
            ((_a = result[key]) !== null && _a !== void 0 ? _a : (result[key] = [])).push(value);
        }
        else {
            result[key] = value;
        }
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--") {
            result["--"] = args.slice(i + 1);
            break;
        }
        else if (arg.startsWith("--")) {
            if (key) {
                set(key, true);
                key = null;
            }
            const [_key, value] = parseKeyValue(arg.slice(2), noCoercion);
            if (value !== undefined) {
                set(_key, value);
            }
            else {
                key = arg.slice(2);
            }
        }
        else if (arg.startsWith("-")) {
            if (key) {
                set(key, true);
                key = null;
            }
            const char = arg.slice(1);
            key = (_a = alias[char]) !== null && _a !== void 0 ? _a : char;
        }
        else if (key) {
            if (noCoercion === true || (Array.isArray(noCoercion) && noCoercion.includes(key))) {
                set(key, arg);
            }
            else {
                set(key, parseValue(arg));
            }
            key = null;
        }
        else {
            const _key = String(index++);
            if (noCoercion === true || (Array.isArray(noCoercion) && noCoercion.includes(_key))) {
                set(_key, arg);
            }
            else {
                set(_key, parseValue(arg));
            }
        }
    }
    if (key) {
        set(key, true);
    }
    return result;
}
/**
 * Quotes a string to be used as a single argument to a shell command.
 */
function quote(arg) {
    if ((/["'\s]/).test(arg)) {
        return `"` + arg.replace(/(["\\$])/g, '\\$1') + `"`;
    }
    return String(arg).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, '$1\\$2');
}
/**
 * Returns the path of the given command if it exists in the system,
 * otherwise returns `null`.
 */
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
/**
 * Executes a command in the terminal and returns the exit code and outputs.
 */
async function run(cmd, args) {
    var _a;
    const isWindows = platform() === "windows";
    const isWslPs = isWSL() && cmd.endsWith("powershell.exe");
    if (typeof Deno === "object") {
        const { Buffer } = await import('node:buffer');
        const { decode } = interop(await import('iconv-lite'), false);
        const _cmd = isWindows && PowerShellCommands.includes(cmd)
            ? new Deno.Command("powershell", { args: ["-c", cmd, ...args.map(quote)] })
            : new Deno.Command(cmd, { args });
        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: isWindows || isWslPs ? decode(Buffer.from(stdout), "cp936") : text(stdout),
            stderr: isWindows || isWslPs ? decode(Buffer.from(stderr), "cp936") : text(stderr),
        };
    }
    else if (typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node)) {
        const { spawn } = await import('child_process');
        const { decode } = await interop(import('iconv-lite'), false);
        const child = isWindows && PowerShellCommands.includes(cmd)
            ? spawn("powershell", ["-c", cmd, ...args.map(quote)])
            : spawn(cmd, args);
        const stdout = [];
        const stderr = [];
        child.stdout.on("data", chunk => {
            if (isWindows || isWslPs) {
                stdout.push(decode(chunk, "cp936"));
            }
            else {
                stdout.push(String(chunk));
            }
        });
        child.stderr.on("data", chunk => {
            if (isWindows || isWslPs) {
                stderr.push(decode(chunk, "cp936"));
            }
            else {
                stderr.push(String(chunk));
            }
        });
        const code = await new Promise((resolve, reject) => {
            child.once("exit", (code, signal) => {
                if (code === null && signal) {
                    resolve(1);
                }
                else {
                    resolve(code !== null && code !== void 0 ? code : 0);
                }
            }).once("error", reject);
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
/**
 * Executes the script inside PowerShell as though they were typed at the
 * PowerShell command prompt.
 *
 * This function can also be called within Windows Subsystem for Linux to
 * directly interact with PowerShell.
 */
async function powershell(script) {
    let command = "powershell";
    if (isWSL()) {
        command = "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";
    }
    return await run(command, ["-c", script]);
}
/**
 * Executes a command with elevated privileges using `sudo` (or UAC in Windows).
 */
async function sudo(cmd, args, options = {}) {
    const _isWindows = platform() === "windows";
    if ((!(options === null || options === void 0 ? void 0 : options.gui) && !_isWindows) || isWSL()) {
        return await run("sudo", [cmd, ...args]);
    }
    const { exec } = await interop(import('sudo-prompt'));
    return await new Promise((resolve, reject) => {
        exec(`${cmd}` + (args.length ? ` ${args.map(quote).join(" ")}` : ""), {
            name: (options === null || options === void 0 ? void 0 : options.title) || (isDeno ? "Deno" : isBun ? "Bun" : "NodeJS"),
        }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                let _stdout = String(stdout);
                if (_isWindows && cmd === "echo" && _stdout.startsWith(`"`)) {
                    // In Windows CMD, the `echo` command will output the string
                    // with double quotes. We need to remove them.
                    let lastIndex = _stdout.lastIndexOf(`"`);
                    _stdout = _stdout.slice(1, lastIndex) + _stdout.slice(lastIndex + 1);
                }
                resolve({
                    code: 0,
                    stdout: _stdout,
                    stderr: String(stderr),
                });
            }
        });
    });
}

export { PopularPlatforms, isTsRuntime, isWSL, parseArgs, platform, powershell, quote, run, sudo, which };
//# sourceMappingURL=cli.js.map
