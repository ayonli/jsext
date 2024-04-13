/**
 * Useful utility functions for interacting with the terminal.
 * 
 * NOTE: this module is not intended to be used in the browser.
 * @module
 */

import { text } from "./bytes.ts";
import { interop } from "./module.ts";
import { PowerShellCommands } from "./cli/constants.ts";

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
export function quote(arg: string) {
    if ((/["'\s]/).test(arg)) {
        if (platform() === "windows") {
            return `"` + arg.replace(/(["\\$])/g, '\\$1') + `"`;
        } else {
            return `"` + arg.replace(/(["\\$`!])/g, '\\$1') + `"`;
        }
    }

    return String(arg).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, '$1\\$2');
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

    if (typeof Deno === "object") {
        const { Buffer } = await import("node:buffer");
        // @ts-ignore
        const { decode } = await interop(import("npm:iconv-lite"), false);
        const _cmd = isWindows && PowerShellCommands.includes(cmd)
            ? new Deno.Command("powershell", { args: ["-c", cmd, ...args.map(quote)] })
            : new Deno.Command(cmd, { args });

        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: isWindows ? decode(Buffer.from(stdout), "cp936") : text(stdout),
            stderr: isWindows ? decode(Buffer.from(stderr), "cp936") : text(stderr),
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
            if (isWindows) {
                stdout.push(decode(chunk, "cp936"));
            } else {
                stdout.push(String(chunk));
            }
        });
        child.stderr.on("data", chunk => {
            if (isWindows) {
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
