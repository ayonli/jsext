import { isWide, isFullWidth } from '../external/code-point-utils/index.js';
import { byteLength, chars } from '../string.js';
import { EMOJI_CHAR } from '../string/constants.js';
import bytes, { equals } from '../bytes.js';
import { isDeno, isNodeLike, isBrowserWindow } from '../env.js';
import '../error.js';
import { platform } from '../runtime.js';
import { sum } from '../math.js';
import { Mutex } from '../lock.js';
import { ControlKeys, NavigationKeys, FunctionKeys } from './constants.js';
export { ControlSequences } from './constants.js';
import { NotSupportedError } from '../error/common.js';

/**
 * Useful utility functions for interacting with the terminal.
 *
 * NOTE: Despite the name of this module, many of its functions can also be used
 * in the browser environment.
 * @module
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
 *
 * @example
 * ```ts
 * // main.ts
 * // launch with `deno run main.ts --name=Bob --age=30`
 * // or `node main.js --name=Bob --age=30`
 * // or `bun run main.ts --name=Bob --age=30`
 * import { args } from "@ayonli/jsext/cli";
 *
 * console.log(args);
 * // [
 * //     "--name=Bob",
 * //     "--age=30"
 * // ]
 * ```
 */
const args = (() => {
    if (isDeno) {
        return Deno.args;
    }
    else if (isNodeLike) {
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
    if (isDeno) {
        return Deno.stdin.isTerminal();
    }
    else if (isNodeLike) {
        return process.stdin.isTTY;
    }
    else {
        return false;
    }
})();
/**
 * Returns the width of a single character.
 *
 * @example
 * ```ts
 * import { charWidth } from "@ayonli/jsext/cli";
 *
 * console.log(charWidth("a")); // 1
 * console.log(charWidth("你")); // 2
 * console.log(charWidth("👋")); // 2
 * console.log(charWidth("♥")); // 1
 * ```
 */
function charWidth(char) {
    if (EMOJI_CHAR.test(char)) {
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
 *
 * @example
 * ```ts
 * import { stringWidth } from "@ayonli/jsext/cli";
 *
 * console.log(stringWidth("Hello, World!")); // 13
 * console.log(stringWidth("你好，世界！")); // 12
 * console.log(stringWidth("👋🌍🚀♥️♣")); // 8
 * ```
 */
function stringWidth(str) {
    return sum(...chars(str).map(charWidth));
}
function throwNoStdioError(type) {
    throw new NotSupportedError(`No ${type} available`);
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
        throw new NotSupportedError("Not a terminal");
    }
    const lock = await stdinMutex.lock();
    try {
        if (isDeno) {
            try {
                Deno.stdin.setRaw(true);
                return await task();
            }
            finally {
                Deno.stdin.setRaw(false);
            }
        }
        else if (isNodeLike) {
            const { stdin } = process;
            if (stdin.isPaused()) {
                stdin.resume();
            }
            // copy listeners in cased being modified
            const listeners = [...stdin.listeners("data")];
            if (listeners.length) {
                stdin.removeAllListeners("data");
            }
            try {
                stdin.setRawMode(true);
                return await task();
            }
            finally {
                stdin.setRawMode(false);
                if (listeners.length) {
                    listeners.forEach(listener => stdin.addListener("data", listener));
                }
                else {
                    stdin.pause();
                }
            }
        }
        else {
            throwNoStdioError("stdin");
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
 * NOTE: This function should be used within the task function of {@link lockStdin}.
 */
async function readStdin() {
    if (isDeno) {
        const reader = Deno.stdin.readable.getReader();
        try {
            const { done, value } = await reader.read();
            if (done) {
                return bytes([]);
            }
            else {
                return bytes(value);
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    else if (isNodeLike) {
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
        throwNoStdioError("stdin");
    }
}
/**
 * Writes a chunk of data to the standard output.
 */
async function writeStdout(data) {
    if (isDeno) {
        await Deno.stdout.write(data);
    }
    else if (isNodeLike) {
        await new Promise(resolve => {
            process.stdout.write(data, () => resolve());
        });
    }
    else {
        throwNoStdioError("stdout");
    }
}
/**
 * Writes a chunk of data to the standard output synchronously.
 *
 * NOTE: Despite the function name, the synchronous behavior is only guaranteed
 * in Deno, in Node.js, it may still be asynchronous.
 *
 * Since the behavior is not guaranteed, it is recommended to use the asynchronous
 * `writeStdout` function instead. This synchronous function is only provided for
 * special cases where the asynchronous behavior is not acceptable.
 */
function writeStdoutSync(data) {
    if (isDeno) {
        Deno.stdout.writeSync(data);
    }
    else if (isNodeLike) {
        process.stdout.write(data);
    }
    else {
        throwNoStdioError("stdout");
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
        try {
            const { columns, rows } = Deno.consoleSize(); // this could fail in some environments
            return { width: columns, height: rows };
        }
        catch (_a) {
            return { width: 0, height: 0 };
        }
    }
    else if (isNodeLike) {
        return {
            width: process.stdout.columns,
            height: process.stdout.rows,
        };
    }
    else if (isBrowserWindow) {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }
    else {
        return { width: 0, height: 0 };
    }
}
/** Checks if the program is running in Windows Subsystem for Linux. */
function isWSL() {
    if (platform() !== "linux")
        return false;
    if (isDeno) {
        return Deno.osRelease().includes("microsoft-standard-WSL");
    }
    else if (isNodeLike) {
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
 *
 * @example
 * ```ts
 * import { quote } from "@ayonli/jsext/cli";
 *
 * console.log(quote("Hello, World!")); // "Hello, World!"
 * console.log(quote("Hello, 'World'!")); // "Hello, 'World'!"
 * console.log(quote("Hello, \"World\"!")); // "Hello, \"World\"!"
 * console.log(quote("Hello, $World!")); // "Hello, \$World!"
 * console.log(quote("Hello, `World`!")); // "Hello, \`World\`!"
 * console.log(quote("Hello, \\World!")); // "Hello, \\World!"
 * ```
 */
function quote(arg) {
    if ((/["'\s]/).test(arg)) {
        return `"` + arg.replace(/(["\\$])/g, '\\$1') + `"`;
    }
    return String(arg).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}])/g, '$1\\$2');
}

export { ControlKeys, FunctionKeys, NavigationKeys, args, charWidth, getWindowSize, isTTY, isTypingInput, isWSL, lockStdin, moveLeftBy, moveRightBy, parseArgs, quote, readStdin, stringWidth, writeStdout, writeStdoutSync };
//# sourceMappingURL=common.js.map
