import { trimStart } from './string.js';
import { isNodeLike, isDeno, isBun, isBrowserWindow, isSharedWorker, isDedicatedWorker } from './env.js';
import runtime, { platform, env } from './runtime.js';
import './fs.js';
import { basename } from './path.js';
import { interop } from './module/web.js';
import { PowerShellCommands } from './cli/constants.js';
export { ControlKeys, ControlSequences, FunctionKeys, NavigationKeys } from './cli/constants.js';
import { isWSL, quote } from './cli/common.js';
export { args, charWidth, getWindowSize, isTTY, isTypingInput, lockStdin, moveLeftBy, moveRightBy, parseArgs, readStdin, stringWidth, writeStdout, writeStdoutSync } from './cli/common.js';
import { throwUnsupportedRuntimeError } from './error.js';
import { ensureFsTarget } from './fs/util.js';
import { resolveHomeDir } from './fs/util/server.js';
import { NotSupportedError } from './error/common.js';

/**
 * Useful utility functions for interacting with the terminal.
 *
 * NOTE: Despite the name of this module, many of its functions can also be used
 * in the browser environment.
 * @module
 * @experimental
 */
/**
 * Executes a command in the terminal and returns the exit code and outputs.
 *
 * In Windows, this function will use PowerShell to execute the command when
 * possible, which has a lot UNIX-like aliases/commands available, such as `ls`,
 * `cat`, `rm`, etc.
 *
 * @example
 * ```ts
 * import { run } from "@ayonli/jsext/cli";
 *
 * const { code, stdout, stderr } = await run("echo", ["Hello, World!"]);
 *
 * console.log(code); // 0
 * console.log(JSON.stringify(stdout)); // "Hello, World!\n"
 * console.log(JSON.stringify(stderr)); // ""
 * ```
 */
async function run(cmd, args, options = {}) {
    const signal = options.signal;
    const isWindows = platform() === "windows";
    const isWslPs = isWSL() && cmd.endsWith("powershell.exe");
    if (isNodeLike || isDeno) {
        const { spawn } = await import('node:child_process');
        const { decode } = await interop(import('iconv-lite'), false);
        const child = isWindows && PowerShellCommands.includes(cmd)
            ? spawn("powershell", ["-c", cmd, ...args.map(quote)], { signal })
            : spawn(cmd, args, { signal });
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
        throwUnsupportedRuntimeError();
    }
}
/**
 * Executes the script inside PowerShell as if they were typed at the PowerShell
 * command prompt.
 *
 * This function can also be called within Windows Subsystem for Linux to
 * directly interact with PowerShell.
 *
 * NOTE: This function is only available in Windows and Windows Subsystem for
 * Linux.
 *
 * @example
 * ```ts
 * import { powershell } from "@ayonli/jsext/cli";
 *
 * const cmd = "ls";
 * const {
 *     code,
 *     stdout,
 *     stderr,
 * } = await powershell(`Get-Command -Name ${cmd} | Select-Object -ExpandProperty Source`);
 * ```
 */
async function powershell(script, options = {}) {
    let command = "powershell";
    if (isWSL()) {
        command = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
    }
    return await run(command, ["-c", script], options);
}
/**
 * Executes a command with elevated privileges using `sudo` (or UAC in Windows).
 *
 * @deprecated Running a command (or subprocess) with elevated privileges is
 * dangerous, and the underlying dependency `sudo-prompt` is also deprecated.
 * Use this function with caution.
 *
 * @example
 * ```ts
 * import { sudo } from "@ayonli/jsext/cli";
 *
 * await sudo("apt", ["install", "build-essential"]);
 * ```
 */
async function sudo(cmd, args, options = {}) {
    const _platform = platform();
    if ((_platform !== "windows" && !(options === null || options === void 0 ? void 0 : options.gui)) ||
        (_platform === "linux" && !env("DISPLAY")) ||
        isWSL()) {
        return await run("sudo", [cmd, ...args]);
    }
    if (!["darwin", "windows", "linux"].includes(_platform)) {
        throw new NotSupportedError("Unsupported platform");
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
 *
 * This function is available in Windows as well.
 *
 * @example
 * ```ts
 * import { which } from "@ayonli/jsext/cli";
 *
 * const path = await which("node");
 *
 * console.log(path);
 * // e.g. "/usr/bin/node" in UNIX/Linux or "C:\\Program Files\\nodejs\\node.exe" in Windows
 * ```
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
 *
 * @example
 * ```ts
 * import { edit } from "@ayonli/jsext/cli";
 *
 * await edit("path/to/file.txt");
 *
 * await edit("path/to/file.txt:10"); // open the file at line 10
 * ```
 */
async function edit(filename) {
    filename = ensureFsTarget(filename);
    filename = await resolveHomeDir(filename);
    const match = filename.match(/(:|#L)(\d+)/);
    let line;
    if (match) {
        line = Number(match[2]);
        filename = filename.slice(0, match.index);
    }
    if (isBrowserWindow) {
        window.open("vscode://file/" + trimStart(filename, "/") + (line ? `:${line}` : ""));
        return;
    }
    else if (isSharedWorker
        || isSharedWorker
        || (isDedicatedWorker && (["chrome", "firefox", "safari"]).includes(runtime().identity))) {
        throwUnsupportedRuntimeError();
    }
    const _platform = platform();
    const vscode = await which("code");
    const throwOpenError = (stderr, filename) => {
        throw new Error(stderr || `Unable to open ${filename} in the editor.`);
    };
    if (vscode) {
        const args = line ? ["--goto", `${filename}:${line}`] : [filename];
        const { code, stderr } = await run(vscode, args);
        if (code)
            throwOpenError(stderr, filename);
        return;
    }
    else if (_platform === "darwin") {
        const { code, stderr } = await run("open", ["-t", filename]);
        if (code)
            throwOpenError(stderr, filename);
        return;
    }
    else if (_platform === "windows" || isWSL()) {
        const notepad = _platform === "windows"
            ? "notepad.exe"
            : "/mnt/c/Windows/System32/notepad.exe";
        const { code, stderr } = await run(notepad, [filename]);
        if (code)
            throwOpenError(stderr, filename);
        return;
    }
    let cmd = env("EDITOR")
        || env("VISUAL")
        || (await which("gedit"))
        || (await which("kate"))
        || (await which("vim"))
        || (await which("vi"))
        || (await which("nano"));
    let args;
    if (!cmd) {
        throw new Error("Cannot determine which editor to open.");
    }
    else {
        cmd = basename(cmd);
    }
    if (["gedit", "kate", "vim", "vi", "nano"].includes(cmd)) {
        args = line ? [`+${line}`, filename] : [filename];
    }
    if (["vim", "vi", "nano"].includes(cmd)) {
        if (await which("gnome-terminal")) {
            args = ["--", cmd, ...args];
            cmd = "gnome-terminal";
        }
        else {
            args = ["-e", `'${cmd} ${args.map(quote).join(" ")}'`];
            cmd = (await which("konsole"))
                || (await which("xfce4-terminal"))
                || (await which("deepin-terminal"))
                || (await which("xterm"));
        }
        if (!cmd) {
            throw new Error("Cannot determine which terminal to open.");
        }
    }
    else {
        args = [filename];
    }
    const { code, stderr } = await run(cmd, args);
    if (code)
        throwOpenError(stderr, filename);
}

export { edit, isWSL, powershell, quote, run, sudo, which };
//# sourceMappingURL=cli.js.map
