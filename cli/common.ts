/**
 * Useful utility functions for interacting with the terminal.
 * 
 * NOTE: despite the name of this module, many of its functions can also be used
 * in the browser environment.
 * @module
 * @experimental
 */
import { isFullWidth, isWide } from "../external/code-point-utils/index.ts";
import { byteLength, chars, isEmoji } from "../string.ts";
import bytes, { ByteArray, equals } from "../bytes.ts";
import { isBrowser, isDeno } from "../env.ts";
import { platform } from "../runtime.ts";
import { sum } from "../math.ts";
import { Mutex } from "../lock.ts";
import {
    ControlKeys,
    ControlSequences,
    FunctionKeys,
    NavigationKeys,
} from "./constants.ts";

export {
    ControlKeys,
    ControlSequences,
    FunctionKeys,
    NavigationKeys,
};

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
 * Whether the standard IO is a text terminal.
 */
export const isTTY: boolean = (() => {
    if (typeof Deno === "object") {
        return Deno.stdin.isTerminal();
    } else if (typeof process === "object" && typeof process.stdin === "object") {
        return process.stdin.isTTY;
    } else {
        return false;
    }
})();

/**
 * Returns the width of a single character.
 */
export function charWidth(char: string): 1 | 2 {
    if (isEmoji(char)) {
        const _bytes = byteLength(char);

        // Most emojis are 4 bytes wide, but some are 3 bytes in Windows/Linux,
        // and 6 bytes in macOS.
        return _bytes === 3 || _bytes === 6 ? 1 : 2;
    } else if (isWide(char.codePointAt(0)!) || isFullWidth(char.codePointAt(0)!)) {
        return 2;
    } else {
        return 1;
    }
}

/**
 * Returns the width of a string.
 */
export function stringWidth(str: string): number {
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
export async function lockStdin<T>(task: () => Promise<T>): Promise<T | null> {
    if (!isTTY) {
        throw new Error("Not a terminal");
    }

    const lock = await stdinMutex.lock();

    try {
        if (typeof Deno === "object") {
            try {
                Deno.stdin.setRaw(true);
                return await task();
            } finally {
                Deno.stdin.setRaw(false);
            }
        } else if (typeof process === "object" && typeof process.stdin === "object") {
            const { stdin } = process;

            if (stdin.isPaused()) {
                stdin.resume();
            }

            // copy listeners in cased being modified
            const listeners = [...stdin.listeners("data")];

            if (listeners?.length) {
                stdin.removeAllListeners("data");
            }

            try {
                stdin.setRawMode(true);
                return await task();
            } finally {
                stdin.setRawMode(false);

                if (listeners?.length) {
                    listeners.forEach(listener => stdin.addListener("data", listener as any));
                } else {
                    stdin.pause();
                }
            }
        } else {
            throw new Error("No stdin available");
        }
    } finally {
        lock.unlock();
    }
}

/**
 * Reads a chunk of data from the standard input. This could be a single key
 * stroke, or a multi-byte sequence for input from an IME.
 * 
 * NOTE: this function should be used within the task function of {@link lockStdin}.
 */
export async function readStdin(): Promise<ByteArray> {
    if (typeof Deno !== "undefined") {
        const reader = Deno.stdin.readable.getReader();
        const { done, value } = await reader.read();

        // Must release the lock immediately, otherwise the program won't work
        // properly in the REPL.
        reader.releaseLock();

        if (done) {
            return bytes([]);
        } else {
            return bytes(value);
        }
    } else if (typeof process !== "undefined" && typeof process.stdin === "object") {
        const stdin = process.stdin;
        return new Promise<ByteArray>(resolve => {
            const listener = (chunk: Buffer) => {
                stdin.removeListener("data", listener);
                resolve(bytes(chunk));
            };

            // Don't use `once`, it may not keep the program running in some runtimes,
            // for example, Bun.
            stdin.on("data", listener);
        });
    } else {
        throw new Error("No stdin available");
    }
}

/**
 * Writes a chunk of data to the standard output.
 */
export async function writeStdout(data: ByteArray): Promise<void> {
    if (typeof Deno === "object") {
        await Deno.stdout.write(data);
    } else if (typeof process === "object" && typeof process.stdout === "object") {
        await new Promise<void>(resolve => {
            process.stdout.write(data, () => resolve());
        });
    } else {
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
export function writeStdoutSync(data: ByteArray): void {
    if (typeof Deno === "object") {
        Deno.stdout.writeSync(data);
    } else if (typeof process === "object" && typeof process.stdout === "object") {
        process.stdout.write(data);
    } else {
        throw new Error("No stdout available");
    }
}

/**
 * Moves the cursor to the left base on the width of the given string.
 */
export async function moveLeftBy(str: string): Promise<void> {
    await writeStdout(bytes(`\u001b[${stringWidth(str)}D`));
}

/**
 * Moves the cursor to the right base on the width of the given string.
 */
export async function moveRightBy(str: string): Promise<void> {
    await writeStdout(bytes(`\u001b[${stringWidth(str)}C`));
}

/**
 * Returns `true` if the given data is a typing input. That is, it is not a
 * control key, navigation key, or function key.
 */
export function isTypingInput(data: ByteArray): boolean {
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
export function getWindowSize(): { width: number; height: number; } {
    if (isDeno) {
        const { columns, rows } = Deno.consoleSize();
        return { width: columns, height: rows };
    } else if (typeof process === "object" && typeof process.stdout === "object") {
        return {
            width: process.stdout.columns,
            height: process.stdout.rows,
        };
    } else if (isBrowser) {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    } else {
        return { width: 0, height: 0 };
    }
}

export type CommonPlatforms = "darwin"
    | "windows"
    | "linux";
export const CommonPlatforms: CommonPlatforms[] = [
    "darwin",
    "windows",
    "linux",
];

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