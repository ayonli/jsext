/**
 * Useful utility functions for interacting with the terminal.
 * 
 * NOTE: this module is not intended to be used in the browser.
 * @module
 * @experimental
 */

import { text } from "./bytes.ts";
import { interop } from "./module.ts";
import { PowerShellCommands } from "./cli/constants.ts";
import { isBun, isDeno } from "./parallel/constants.ts";

declare const Bun: object;

export type PopularPlatforms = "android"
    | "darwin"
    | "freebsd"
    | "linux"
    | "windows";
export const PopularPlatforms: PopularPlatforms[] = [
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
export function platform(): PopularPlatforms | "others" {
    if (typeof Deno === "object") {
        if (PopularPlatforms.includes(Deno.build.os as any)) {
            return Deno.build.os as PopularPlatforms;
        } else {
            return "others";
        }
    } else if (typeof process === "object" && typeof process.platform === "string") {
        if (process.platform === "win32") {
            return "windows";
        } else if ((PopularPlatforms as string[]).includes(process.platform)) {
            return process.platform as PopularPlatforms;
        } else {
            return "others";
        }
    } else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Android")) {
            return "android";
        } else if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        } else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        } else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        } else {
            return "others";
        }
    } else {
        return "others";
    }
}

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

/** Checks if the program is running in a TypeScript runtime. */
export function isTsRuntime(): boolean {
    if (typeof Deno === "object" || typeof Bun === "object") {
        return true;
    } else if (typeof process !== "object") {
        return false;
    }

    return process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
        || /\.tsx?$/.test(process.argv[1] ?? "");
}

function parseValue(arg: string): string | number | boolean {
    let value: string | number | boolean = arg.trim();

    if (value === "true") {
        value = true;
    } else if (value === "false") {
        value = false;
    } else if (/^\d+(\.\d+)?$/.test(value)) {
        value = Number(value);
    }

    return value;
}

function parseKeyValue(arg: string): [key: string, value: string | number | boolean | undefined] {
    let index = arg.indexOf("=");

    if (index === -1) {
        return [arg, undefined];
    } else {
        const key = arg.slice(0, index);
        const value = arg.slice(index + 1);
        return [key, parseValue(value)];
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
 *     shorthands: { "p": "has-parents" }
 * });
 * 
 * console.log(args);
 * // {
 * //     _: "Bob",
 * //     age: 30,
 * //     married: true,
 * //     wife: "Alice",
 * //     children: ["Mia", "Ava"],
 * //     "has-parents": true
 * // }
 * ```
 */
export function parseArgs(args: string[], options: {
    shorthands?: { [char: string]: string; };
} = {}): {
    [key: string]: string | number | boolean | (string | number | boolean)[];
    _?: string | number | boolean | (string | number | boolean)[];
} {
    const { shorthands = {} } = options;
    const data: { [key: string]: string | number | boolean | (string | number | boolean)[]; } = {};
    let key: string | null = null;

    const set = (key: string, value: string | number | boolean) => {
        if (Array.isArray(data[key])) {
            (data[key] as (string | number | boolean)[]).push(value);
        } else if (key in data) {
            data[key] = [data[key] as string | number | boolean, value];
        } else {
            data[key] = value;
        }
    };

    for (const arg of args) {
        if (arg.startsWith("--")) {
            if (key) {
                set(key, true);
                key = null;
            }

            const [_key, value] = parseKeyValue(arg.slice(2));

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
            key = shorthands[char] ?? char;
        } else {
            const value = parseValue(arg);

            if (key) {
                set(key, value);
                key = null;
            } else {
                set("_", value);
            }
        }
    }

    if (key) {
        set(key, true);
    }

    return data;
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
        const { decode } = await interop(import("npm:iconv-lite"), false);
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
 * Executes the specified commands (and any parameters) as though they were
 * typed at the PowerShell command prompt, and then exits.
 * 
 * This function can also be called within Windows Subsystem for Linux to
 * directly interact with PowerShell.
 */
export async function powershell(...commands: string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    let command = "powershell";

    if (isWSL()) {
        command = "/mnt/c/WINDOWS/System32/WindowsPowerShell/v1.0/powershell.exe";
    }

    return await run(command, [
        "-c",
        ...commands
    ]);
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

    let exec: (
        cmd: string,
        options: { name?: string; },
        callback: (error?: Error, stdout?: string | Buffer, stderr?: string | Buffer) => void
    ) => void;

    if (isDeno) {
        ({ exec } = await interop(import("npm:sudo-prompt")));
    } else {
        ({ exec } = await interop(import("sudo-prompt")));
    }

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
