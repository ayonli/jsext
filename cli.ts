/**
 * Useful utility functions for interacting with the terminal.
 * 
 * NOTE: despite the name of this module, many of its functions can also be used
 * in the browser environment.
 * @module
 * @experimental
 */

import { text } from "./bytes.ts";
import { interop } from "./module.ts";
import { PowerShellCommands } from "./cli/constants.ts";
import { isBrowser, isBun, isDeno } from "./env.ts";
import runtime, { platform as _platform } from "./runtime.ts";
import { basename } from "./path.ts";
import { trimStart } from "./string.ts";

/**
 * The command-line arguments passed to the program.
 * 
 * This variable is the same as `Deno.args` in Deno and `process.argv.slice(2)`
 * in Node.js or Bun.
 */
export const args: string[] = (() => {
    if (typeof Deno === "object") {
        return Deno.args;
    } else if (typeof process === "object" && Array.isArray(process.argv)) {
        return process.argv.slice(2);
    } else {
        return [];
    }
})();

/**
 * @deprecated import `platform` from `@ayonli/jsext/runtime` module instead.
 */
export const platform = _platform;

/**
 * @deprecated use `runtime().tsSupport` from `@ayonli/jsext/runtime` module instead.
 */
export const isTsRuntime = () => runtime().tsSupport;

/** Checks if the program is running in Windows Subsystem for Linux. */
export function isWSL(): boolean {
    if (platform() !== "linux")
        return false;

    if (typeof Deno === "object") {
        return Deno.osRelease().includes("microsoft-standard-WSL");
    } else if (typeof process === "object" && typeof process.env === "object") {
        return !!process.env["WSL_INTEROP"];
    }

    return false;
}

function parseValue(arg: string): string | number | boolean {
    let value: string | number | boolean = arg.trim();

    if (value === "true") {
        value = true;
    } else if (value === "false") {
        value = false;
    } else if (/^[-+]?\d+(\.\d+)?$/.test(value)) {
        value = Number(value);
    }

    return value;
}

function parseKeyValue(
    arg: string,
    noCoercion: boolean | string[] = false
): [key: string, value: string | number | boolean | undefined] {
    let index = arg.indexOf("=");

    if (index === -1) {
        return [arg, undefined];
    } else {
        const key = arg.slice(0, index);
        const value = arg.slice(index + 1);

        if (noCoercion === true || (Array.isArray(noCoercion) && noCoercion.includes(key))) {
            return [key, value];
        } else {
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
export function parseArgs(args: string[], options: {
    alias?: { [char: string]: string; };
    lists?: string[];
    noCoercion?: boolean | string[];
} = {}): {
    [key: string]: string | number | boolean | (string | number | boolean)[];
    [x: number]: string | number | boolean;
    "--"?: string[];
} {
    const { alias: alias = {}, lists = [], noCoercion = false } = options;
    const result: {
        [key: string]: string | number | boolean | (string | number | boolean)[];
        [x: number]: string | number | boolean;
        "--"?: string[];
    } = {};
    let key: string | null = null;
    let index: number = 0;

    const set = (key: string, value: string | number | boolean) => {
        if (lists.includes(key)) {
            ((result[key] ??= []) as (string | number | boolean)[]).push(value);
        } else {
            result[key] = value;
        }
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]!;

        if (arg === "--") {
            result["--"] = args.slice(i + 1);
            break;
        } else if (arg.startsWith("--")) {
            if (key) {
                set(key, true);
                key = null;
            }

            const [_key, value] = parseKeyValue(arg.slice(2), noCoercion);

            if (value !== undefined) {
                set(_key, value);
            } else {
                key = arg.slice(2);
            }
        } else if (arg.startsWith("-")) {
            if (key) {
                set(key, true);
                key = null;
            }

            const char = arg.slice(1);
            key = alias[char] ?? char;
        } else if (key) {
            if (noCoercion === true || (Array.isArray(noCoercion) && noCoercion.includes(key))) {
                set(key, arg);
            } else {
                set(key, parseValue(arg));
            }

            key = null;
        } else {
            const _key = String(index++);

            if (noCoercion === true || (Array.isArray(noCoercion) && noCoercion.includes(_key))) {
                set(_key, arg);
            } else {
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
export function quote(arg: string): string {
    if ((/["'\s]/).test(arg)) {
        return `"` + arg.replace(/(["\\$])/g, '\\$1') + `"`;
    }

    return String(arg).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, '$1\\$2');
}

/**
 * Returns the path of the given command if it exists in the system,
 * otherwise returns `null`.
 */
export async function which(cmd: string): Promise<string | null> {
    if (platform() === "windows") {
        const { code, stdout } = await run("powershell", [
            "-Command",
            `Get-Command -Name ${cmd} | Select-Object -ExpandProperty Source`
        ]);
        return code ? null : stdout.trim();
    } else {
        const { code, stdout } = await run("which", [cmd]);
        return code ? null : stdout.trim();
    }
}

/**
 * Executes a command in the terminal and returns the exit code and outputs.
 */
export async function run(cmd: string, args: string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const isWindows = platform() === "windows";
    const isWslPs = isWSL() && cmd.endsWith("powershell.exe");

    if (typeof Deno === "object") {
        const { Buffer } = await import("node:buffer");
        const { decode } = interop(await import("iconv-lite"), false);
        const _cmd = isWindows && PowerShellCommands.includes(cmd)
            ? new Deno.Command("powershell", { args: ["-c", cmd, ...args.map(quote)] })
            : new Deno.Command(cmd, { args });

        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: isWindows || isWslPs ? decode(Buffer.from(stdout), "cp936") : text(stdout),
            stderr: isWindows || isWslPs ? decode(Buffer.from(stderr), "cp936") : text(stderr),
        };
    } else if (typeof process === "object" && !!process.versions?.node) {
        const { spawn } = await import("child_process");
        const { decode } = await interop(import("iconv-lite"), false);
        const child = isWindows && PowerShellCommands.includes(cmd)
            ? spawn("powershell", ["-c", cmd, ...args.map(quote)])
            : spawn(cmd, args);
        const stdout: string[] = [];
        const stderr: string[] = [];

        child.stdout.on("data", chunk => {
            if (isWindows || isWslPs) {
                stdout.push(decode(chunk, "cp936"));
            } else {
                stdout.push(String(chunk));
            }
        });
        child.stderr.on("data", chunk => {
            if (isWindows || isWslPs) {
                stderr.push(decode(chunk, "cp936"));
            } else {
                stderr.push(String(chunk));
            }
        });

        const code = await new Promise<number>((resolve, reject) => {
            child.once("exit", (code, signal) => {
                if (code === null && signal) {
                    resolve(1);
                } else {
                    resolve(code ?? 0);
                }
            }).once("error", reject);
        });

        return {
            code,
            stdout: stdout.join(""),
            stderr: stderr.join(""),
        };
    } else {
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
export async function powershell(script: string): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    let command = "powershell";

    if (isWSL()) {
        command = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";
    }

    return await run(command, ["-c", script]);
}

/**
 * Executes a command with elevated privileges using `sudo` (or UAC in Windows).
 */
export async function sudo(cmd: string, args: string[], options: {
    /**
     * By default, this function will use the `sudo` command when available and
     * running in text mode. Set this option to `true` to force using the GUI
     * prompt instead.
     * 
     * NOTE: this option is not available and will be ignored in Windows
     * Subsystem for Linux.
     */
    gui?: boolean;
    /** Custom the dialog's title when `gui` option is set. */
    title?: string;
} = {}): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const _isWindows = platform() === "windows";

    if ((!options?.gui && !_isWindows) || isWSL()) {
        return await run("sudo", [cmd, ...args]);
    }

    const { exec } = await interop(import("sudo-prompt"));
    return await new Promise((resolve, reject) => {
        exec(`${cmd}` + (args.length ? ` ${args.map(quote).join(" ")}` : ""), {
            name: options?.title || (isDeno ? "Deno" : isBun ? "Bun" : "NodeJS"),
        }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
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

/** Returns all environment variables in an object. */
export function env(): { [name: string]: string; };
/** Returns a specific environment variable. */
export function env(name: string): string | undefined;
/**
 * Sets the value of a specific environment variable.
 * 
 * NOTE: this is a temporary change and will not persist when the program exits.
 */
export function env(name: string, value: string): undefined;
export function env(name: string | undefined = undefined, value: string | undefined = undefined): any {
    if (typeof Deno === "object") {
        if (name === undefined) {
            return Deno.env.toObject();
        } else if (value === undefined) {
            return Deno.env.get(name);
        } else {
            Deno.env.set(name, value);
        }
    } else if (typeof process === "object" && typeof process.env === "object") {
        if (name === undefined) {
            return process.env;
        } else if (value === undefined) {
            return process.env[name];
        } else {
            process.env[name] = value;
        }
    } else {
        // @ts-ignore
        const env = globalThis["__env__"] as any;

        // @ts-ignore
        if (env === undefined || env === null || typeof env === "object") {
            if (name === undefined) {
                return env ?? {};
            } else if (value === undefined) {
                return env?.[name] ?? undefined;
            }

            // @ts-ignore
            (globalThis["__env__"] ??= {})[name] = value;
            return;
        } else {
            throw new Error("Unsupported runtime");
        }
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
export async function edit(filename: string): Promise<void> {
    const match = filename.match(/(:|#L)(\d+)/);
    let line: number | undefined;

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
    } else if (_platform === "darwin") {
        const { code, stderr } = await run("open", ["-t", filename]);

        if (code)
            throw new Error(stderr || `Failed to open ${filename} in the editor.`);

        return;
    } else if (_platform === "windows" || isWSL()) {
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
    let args: string[] | undefined;

    if (!editor) {
        throw new Error("Cannot determine the editor to open.");
    } else {
        editor = basename(editor);
    }

    if (["gedit", "kate", "vim", "vi", "nano"].includes(editor)) {
        args = line ? [`+${line}`, filename] : [filename];
    }

    if (["vim", "vi", "nano"].includes(editor)) {
        if (await which("gnome-terminal")) {
            args = ["--", editor, ...args!];
            editor = "gnome-terminal";
        } else {
            args = ["-e", `'${editor} ${args!.map(quote).join(" ")}'`];
            editor = (await which("konsole"))
                || (await which("xfce4-terminal"))
                || (await which("deepin-terminal"))
                || (await which("xterm"));
        }

        if (!editor) {
            throw new Error("Cannot determine the terminal to open.");
        }
    } else {
        args = [filename];
    }

    const { code, stderr } = await run(editor, args!);

    if (code)
        throw new Error(stderr || `Failed to open ${filename} in the editor.`);
}
