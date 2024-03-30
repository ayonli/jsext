import bytes, { ByteArray, concat, equals } from "../bytes/index.ts";
import { sum } from "../math/index.ts";
import { byteLength, chars } from "../string/index.ts";

export const LF = bytes("\n"); // ^J - Enter on Linux
export const CR = bytes("\r"); // ^M - Enter on macOS and Windows (CRLF)
export const TAB = bytes("\t"); // ^I - Tab
export const BS = bytes("\b"); // ^H - Backspace on Linux and Windows
export const DEL = bytes([0x7f]); // ^? - Backspace on macOS
export const ESC = bytes([0x1b]); // ^[ - Escape
export const CANCEL = bytes([0x03]); // ^C - Cancel
export const START = bytes([0x01]); // ^A - Start of text
export const END = bytes([0x05]); // ^E - End of text
export const CLR = bytes("\r\u001b[K"); // Clear the current line
export const CLR_RIGHT = bytes("\u001b[0K");
export const CLR_LEFT = bytes("\u001b[1K");
export const LEFT = bytes("\u001b[D");
export const RIGHT = bytes("\u001b[C");
export const UP = bytes("\u001b[A");
export const DOWN = bytes("\u001b[B");

export type KeypressEventInfo = {
    sequence: string;
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
};

export type NodeStdin = NodeJS.ReadStream & { fd: 0; };
export type NodeStdout = NodeJS.WriteStream & { fd: 1; };
export type DenoStdin = typeof Deno.stdin;
export type DenoStdout = typeof Deno.stdout;

function toLeft(str: string) {
    const _chars = chars(str);
    const length = sum(..._chars.map(char => Math.min(byteLength(char), 2)));
    return bytes(`\u001b[${length}D`);
}

function toRight(str: string) {
    const _chars = chars(str);
    const length = sum(..._chars.map(char => Math.min(byteLength(char), 2)));
    return bytes(`\u001b[${length}C`);
}

export async function read(stdin: NodeStdin | DenoStdin): Promise<ByteArray> {
    if ("fd" in stdin) {
        return new Promise<ByteArray>(resolve => {
            stdin.once("data", (chunk: Buffer) => {
                resolve(bytes(chunk));
            });
        });
    } else {
        const reader = stdin.readable.getReader();
        const { done, value } = await reader.read();

        reader.releaseLock();

        if (done) {
            return bytes([]);
        } else {
            return bytes(value);
        }
    }
}

export async function write(stdout: NodeStdout | DenoStdout, data: ByteArray) {
    if ("fd" in stdout) {
        await new Promise<void>(resolve => {
            stdout.write(data, () => resolve());
        });
    } else {
        await stdout.write(data);
    }
}

export function writeSync(stdout: NodeStdout | DenoStdout, data: ByteArray) {
    if ("fd" in stdout) {
        write(stdout, data);
    } else {
        stdout.writeSync(data);
    }
}

export function isCancelEvent(buf: Uint8Array) {
    return equals(buf, ESC) || equals(buf, CANCEL);
}

async function question(
    stdin: NodeStdin | DenoStdin,
    stdout: NodeStdout | DenoStdout,
    message: string,
    defaultValue: string = ""
) {
    const buf: string[] = [];
    let cursor = 0;

    await write(stdout, bytes(message));

    if (defaultValue) {
        await write(stdout, bytes(defaultValue));
        const _chars = chars(defaultValue);
        buf.push(..._chars);
        cursor += _chars.length;
    }

    while (true) {
        const input = await read(stdin);

        if (!input.length || equals(input, UP) || equals(input, DOWN)) {
            continue;
        } else if (equals(input, LEFT)) {
            if (cursor > 0) {
                const char = buf[--cursor]!;
                await write(stdout, toLeft(char));
            }
        } else if (equals(input, RIGHT)) {
            if (cursor < buf.length) {
                const char = buf[cursor++]!;
                await write(stdout, toRight(char));
            }
        } else if (equals(input, START)) {
            const left = buf.slice(0, cursor);

            if (left.length) {
                cursor = 0;
                await write(stdout, toLeft(left.join("")));
            }
        } else if (equals(input, END)) {
            const right = buf.slice(cursor);

            if (right.length) {
                cursor = buf.length;
                await write(stdout, toRight(right.join("")));
            }
        } else if (isCancelEvent(input)) {
            await write(stdout, LF);
            return null;
        } else if (equals(input, CR) || equals(input, LF)) {
            await write(stdout, LF);
            return buf.join("");
        } else if (equals(input, BS) || equals(input, DEL)) {
            if (cursor > 0) {
                cursor--;
                const [char] = buf.splice(cursor, 1);
                const rest = buf.slice(cursor);

                await write(stdout, toLeft(char!));
                await write(stdout, CLR_RIGHT);

                if (rest.length) {
                    const output = rest.join("");
                    await write(stdout, bytes(output));
                    await write(stdout, toLeft(output));
                }
            }
        } else {
            const _chars = chars(String(input));

            if (cursor === buf.length) {
                buf.push(..._chars);
                cursor += _chars.length;
                await write(stdout, input);
            } else {
                buf.splice(cursor, 0, ..._chars);
                cursor += _chars.length;
                const rest = buf.slice(cursor).join("");

                await write(stdout, concat(input, bytes(rest)));
                await write(stdout, toLeft(rest));
            }
        }
    }
}

async function hijackStdin<T>(stdin: NodeStdin, task: () => Promise<T>) {
    const _listeners = stdin.listeners("keypress");
    stdin.removeAllListeners("keypress");

    const result = await task();

    _listeners.forEach(listener => stdin.addListener("keypress", listener as any));

    return result;
}

export async function isNodeRepl() {
    const repl = await import("repl");
    // @ts-ignore fix CommonJS import
    return !!(repl.default ?? repl).repl;
}

export async function questionInNodeRepl(
    message: string,
    defaultValue = ""
): Promise<string | null> {
    return await hijackStdin(process.stdin, async () => {
        return await questionInNode(message, defaultValue);
    });
}

export async function questionInNode(
    message: string,
    defaultValue = ""
) {
    const { stdin, stdout } = process;

    if (!stdout.isTTY) {
        return null;
    }

    if (stdin.isPaused()) {
        stdin.resume();
    }

    const rawMode = stdin.isRaw;
    rawMode || stdin.setRawMode(true);

    try {
        return await question(stdin, stdout, message, defaultValue);
    } finally {
        stdin.setRawMode(rawMode);

        if (!(await isNodeRepl())) {
            stdin.pause();
        }
    }
}

export function isDenoRepl() {
    return typeof Deno === "object" && Deno.mainModule.endsWith("$deno$repl.ts");
}

export async function questionInDeno(
    message: string,
    defaultValue = ""
): Promise<string | null> {
    const { stdin, stdout } = Deno;

    if (!stdin.isTerminal()) {
        return null;
    }

    stdin.setRaw(true);

    try {
        return await question(stdin, stdout, message, defaultValue);
    } finally {
        stdin.setRaw(false);
    }
}
