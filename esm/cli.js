import { isWide, isFullWidth } from './external/code-point-utils/index.js';
import { isEmoji, byteLength, chars, trimStart } from './string.js';
import bytes, { equals, text } from './bytes.js';
import { isDeno, isBrowser, isBun } from './env.js';
import runtime, { platform as platform$1, env } from './runtime.js';
import { interop } from './module.js';
import { basename } from './path.js';
import { sum } from './math.js';
import { Mutex } from './lock.js';
import { ControlKeys, NavigationKeys, FunctionKeys, PowerShellCommands } from './cli/constants.js';
export { ControlSequences } from './cli/constants.js';

/**
 * Useful utility functions for interacting with the terminal.
 *
 * NOTE: despite the name of this module, many of its functions can also be used
 * in the browser environment.
 * @module
 * @experimental
 */
const NonTypingKeys = [
    ...Object.values(ControlKeys),
    ...Object.values(NavigationKeys),
    ...Object.values(FunctionKeys),
];
/**
 * The command-line arguments passed to the program.
 *
 * This variable is the same as `Deno.args` in Deno and `process.argv.slice(2)`
 * in Node.js or Bun.
 */
const args = (() => {
    if (typeof Deno === "object") {
        return Deno.args;
    }
    else if (typeof process === "object" && Array.isArray(process.argv)) {
        return process.argv.slice(2);
    }
    else {
        return [];
    }
})();
/**
 * Whether the standard IO is a text terminal.
 */
const isTTY = (() => {
    if (typeof Deno === "object") {
        return Deno.stdin.isTerminal();
    }
    else if (typeof process === "object" && typeof process.stdin === "object") {
        return process.stdin.isTTY;
    }
    else {
        return false;
    }
})();
/**
 * @deprecated use `runtime().tsSupport` from `@ayonli/jsext/runtime` module instead.
 */
const isTsRuntime = () => runtime().tsSupport;
/**
 * @deprecated import `platform` from `@ayonli/jsext/runtime` module instead.
 */
const platform = platform$1;
/**
 * Returns the width of a single character.
 */
function charWidth(char) {
    if (isEmoji(char)) {
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
/**
 * Returns the width of a string.
 */
function stringWidth(str) {
    return sum(...chars(str).map(charWidth));
}
const stdinMutex = new Mutex(1);
/**
 * Requests the standard input to be used only by the given task until it is
 * completed.
 *
 * This function sets the `stdin` in raw mode, and excludes other parts of the
 * program from reading from it at the same time . This is important so that our
 * program won't be affected by other tasks, especially in a REPL environment.
 *
 * @example
 * ```ts
 * // A simple program that reads a line of text from user input.
 * import process from "node:process";
 * import bytes, { equals } from "@ayonli/jsext/bytes";
 * import { chars } from "@ayonli/jsext/string";
 * import {
 *     ControlKeys,
 *     ControlSequences,
 *     lockStdin,
 *     readStdin,
 *     writeStdout,
 *     isTypingInput,
 *     moveLeftBy,
 * } from "@ayonli/jsext/cli";
 *
 * const input = await lockStdin(async () => {
 *     await writeStdout(bytes("Type something: "));
 *
 *     const buf: string[] = []
 *
 *     while (true) {
 *         const input = await readStdin();
 *
 *         if (equals(input, ControlKeys.CTRL_C) || equals(input, ControlKeys.ESC)) {
 *             console.error("\nUser cancelled");
 *             process.exit(1);
 *         } else if (equals(input, ControlKeys.CR) || equals(input, ControlKeys.LF)) {
 *             await writeStdout(ControlKeys.LF);
 *             break;
 *         } else if (equals(input, ControlKeys.BS) || equals(input, ControlKeys.DEL)) {
 *             if (buf.length > 0) {
 *                 const char = buf.pop()!;
 *                 await moveLeftBy(char);
 *                 await writeStdout(ControlSequences.CLR_RIGHT);
 *             }
 *         } else if (isTypingInput(input)) {
 *             buf.push(...chars(String(input)));
 *             await writeStdout(input);
 *         }
 *     }
 *
 *     return buf.join("")
 * });
 *
 * console.log(`You typed: ${input}`);
 * ```
 */
async function lockStdin(task) {
    if (!isTTY) {
        throw new Error("Not a terminal");
    }
    const lock = await stdinMutex.lock();
    try {
        if (typeof Deno === "object") {
            try {
                Deno.stdin.setRaw(true);
                return await task();
            }
            finally {
                Deno.stdin.setRaw(false);
            }
        }
        else if (typeof process === "object" && typeof process.stdin === "object") {
            const { stdin } = process;
            if (stdin.isPaused()) {
                stdin.resume();
            }
            // copy listeners in cased being modified
            const listeners = [...stdin.listeners("data")];
            if (listeners === null || listeners === void 0 ? void 0 : listeners.length) {
                stdin.removeAllListeners("data");
            }
            try {
                stdin.setRawMode(true);
                return await task();
            }
            finally {
                stdin.setRawMode(false);
                if (listeners === null || listeners === void 0 ? void 0 : listeners.length) {
                    listeners.forEach(listener => stdin.addListener("data", listener));
                }
                else {
                    stdin.pause();
                }
            }
        }
        else {
            throw new Error("No stdin available");
        }
    }
    finally {
        lock.unlock();
    }
}
/**
 * Reads a chunk of data from the standard input. This could be a single key
 * stroke, or a multi-byte sequence for input from an IME.
 *
 * NOTE: this function should be used within the task function of {@link lockStdin}.
 */
async function readStdin() {
    if (typeof Deno !== "undefined") {
        const reader = Deno.stdin.readable.getReader();
        const { done, value } = await reader.read();
        // Must release the lock immediately, otherwise the program won't work
        // properly in the REPL.
        reader.releaseLock();
        if (done) {
            return bytes([]);
        }
        else {
            return bytes(value);
        }
    }
    else if (typeof process !== "undefined" && typeof process.stdin === "object") {
        const stdin = process.stdin;
        return new Promise(resolve => {
            const listener = (chunk) => {
                stdin.removeListener("data", listener);
                resolve(bytes(chunk));
            };
            // Don't use `once`, it may not keep the program running in some runtimes,
            // for example, Bun.
            stdin.on("data", listener);
        });
    }
    else {
        throw new Error("No stdin available");
    }
}
/**
 * Writes a chunk of data to the standard output.
 */
async function writeStdout(data) {
    if (typeof Deno === "object") {
        await Deno.stdout.write(data);
    }
    else if (typeof process === "object" && typeof process.stdout === "object") {
        await new Promise(resolve => {
            process.stdout.write(data, () => resolve());
        });
    }
    else {
        throw new Error("No stdout available");
    }
}
/**
 * Writes a chunk of data to the standard output synchronously.
 *
 * NOTE: despite the function name, the synchronous behavior is only guaranteed
 * in Deno, in Node.js, it may still be asynchronous.
 *
 * Since the behavior is not guaranteed, it is recommended to use the asynchronous
 * `writeStdout` function instead. This synchronous function is only provided for
 * special cases where the asynchronous behavior is not acceptable.
 */
function writeStdoutSync(data) {
    if (typeof Deno === "object") {
        Deno.stdout.writeSync(data);
    }
    else if (typeof process === "object" && typeof process.stdout === "object") {
        process.stdout.write(data);
    }
    else {
        throw new Error("No stdout available");
    }
}
/**
 * Moves the cursor to the left base on the width of the given string.
 */
async function moveLeftBy(str) {
    await writeStdout(bytes(`\u001b[${stringWidth(str)}D`));
}
/**
 * Moves the cursor to the right base on the width of the given string.
 */
async function moveRightBy(str) {
    await writeStdout(bytes(`\u001b[${stringWidth(str)}C`));
}
/**
 * Returns `true` if the given data is a typing input. That is, it is not a
 * control key, navigation key, or function key.
 */
function isTypingInput(data) {
    return data.length > 0 && !NonTypingKeys.some(key => equals(data, key));
}
/**
 * Returns the current size of the application window.
 *
 * In the terminal, this is the size of the terminal window, where `width` and
 * `height` are the corresponding columns and rows.
 *
 * In the browser, this is the size of the viewport, where `width` and `height`
 * are measured in pixels.
 */
function getWindowSize() {
    if (isDeno) {
        const { columns, rows } = Deno.consoleSize();
        return { width: columns, height: rows };
    }
    else if (typeof process === "object" && typeof process.stdout === "object") {
        return {
            width: process.stdout.columns,
            height: process.stdout.rows,
        };
    }
    else if (isBrowser) {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }
    else {
        return { width: 0, height: 0 };
    }
}
const CommonPlatforms = [
    "darwin",
    "windows",
    "linux",
];
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
function parseValue(arg) {
    let value = arg.trim();
    if (value === "true") {
        value = true;
    }
    else if (value === "false") {
        value = false;
    }
    else if (/^[-+]?\d+(\.\d+)?$/.test(value)) {
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
 * Executes the script inside PowerShell as if they were typed at the PowerShell
 * command prompt.
 *
 * This function can also be called within Windows Subsystem for Linux to
 * directly interact with PowerShell.
 */
async function powershell(script) {
    let command = "powershell";
    if (isWSL()) {
        command = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
    }
    return await run(command, ["-c", script]);
}
/**
 * Executes a command with elevated privileges using `sudo` (or UAC in Windows).
 */
async function sudo(cmd, args, options = {}) {
    const _platform = platform();
    if ((_platform !== "windows" && !(options === null || options === void 0 ? void 0 : options.gui)) ||
        (_platform === "linux" && !env("DISPLAY")) ||
        isWSL()) {
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
                if (_platform === "windows" && cmd === "echo" && _stdout.startsWith(`"`)) {
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
 * Opens the given file in a text editor.
 *
 * The `filename` can include a line number by appending `:<number>` or `#L<number>`,
 * however, this feature is not supported by all editors.
 *
 * This function will try to open VS Code if available, otherwise it will try to
 * open the default editor or a preferred one, such as `vim` or `nano` when available.
 *
 * Some editor may hold the terminal until the editor is closed, while others may
 * return immediately. Anyway, the operation is asynchronous and the function will
 * not block the thread.
 *
 * In the browser, this function will always try to open the file in VS Code,
 * regardless of whether it's available or not.
 */
async function edit(filename) {
    const match = filename.match(/(:|#L)(\d+)/);
    let line;
    if (match) {
        line = Number(match[2]);
        filename = filename.slice(0, match.index);
    }
    if (isBrowser) {
        window.open("vscode://file/" + trimStart(filename, "/") + (line ? `:${line}` : ""));
        return;
    }
    const _platform = platform();
    const vscode = await which("code");
    if (vscode) {
        const args = line ? ["--goto", `${filename}:${line}`] : [filename];
        const { code, stderr } = await run(vscode, args);
        if (code)
            throw new Error(stderr || `Failed to open ${filename} in the editor.`);
        return;
    }
    else if (_platform === "darwin") {
        const { code, stderr } = await run("open", ["-t", filename]);
        if (code)
            throw new Error(stderr || `Failed to open ${filename} in the editor.`);
        return;
    }
    else if (_platform === "windows" || isWSL()) {
        const notepad = _platform === "windows"
            ? "notepad.exe"
            : "/mnt/c/Windows/System32/notepad.exe";
        const { code, stderr } = await run(notepad, [filename]);
        if (code)
            throw new Error(stderr || `Failed to open ${filename} in the editor.`);
        return;
    }
    let editor = env("EDITOR")
        || env("VISUAL")
        || (await which("gedit"))
        || (await which("kate"))
        || (await which("vim"))
        || (await which("vi"))
        || (await which("nano"));
    let args;
    if (!editor) {
        throw new Error("Cannot determine the editor to open.");
    }
    else {
        editor = basename(editor);
    }
    if (["gedit", "kate", "vim", "vi", "nano"].includes(editor)) {
        args = line ? [`+${line}`, filename] : [filename];
    }
    if (["vim", "vi", "nano"].includes(editor)) {
        if (await which("gnome-terminal")) {
            args = ["--", editor, ...args];
            editor = "gnome-terminal";
        }
        else {
            args = ["-e", `'${editor} ${args.map(quote).join(" ")}'`];
            editor = (await which("konsole"))
                || (await which("xfce4-terminal"))
                || (await which("deepin-terminal"))
                || (await which("xterm"));
        }
        if (!editor) {
            throw new Error("Cannot determine the terminal to open.");
        }
    }
    else {
        args = [filename];
    }
    const { code, stderr } = await run(editor, args);
    if (code)
        throw new Error(stderr || `Failed to open ${filename} in the editor.`);
}

export { CommonPlatforms, ControlKeys, FunctionKeys, NavigationKeys, args, charWidth, edit, getWindowSize, isTTY, isTsRuntime, isTypingInput, isWSL, lockStdin, moveLeftBy, moveRightBy, parseArgs, platform, powershell, quote, readStdin, run, stringWidth, sudo, which, writeStdout, writeStdoutSync };
//# sourceMappingURL=cli.js.map
