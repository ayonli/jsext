import bytes, { ByteArray, concat, equals } from "../bytes/index.ts";

export const LF = "\n".charCodeAt(0); // ^J - Enter on Linux
export const CR = "\r".charCodeAt(0); // ^M - Enter on macOS and Windows (CRLF)
export const BS = "\b".charCodeAt(0); // ^H - Backspace on Linux and Windows
export const DEL = 0x7f; // ^? - Backspace on macOS
export const ESC = 0x1b; // ^[ - Escape
export const CANCEL = 0x03; // ^C - Cancel
export const CLR = bytes("\r\u001b[K"); // Clear the current line
export const CLR_RIGHT = bytes("\u001b[0K");
export const CLR_LEFT = bytes("\u001b[1K");
export const LEFT = bytes("\u001b[D");
export const RIGHT = bytes("\u001b[C");

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
    return buf.length === 1 && (buf[0] === ESC || buf[0] === CANCEL);
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
        buf.push(...defaultValue);
        cursor += defaultValue.length;
    }

    while (true) {
        const char = await read(stdin);

        if (!char.length) {
            continue;
        } else if (equals(char, LEFT)) {
            if (cursor > 0) {
                cursor--;
                await write(stdout, LEFT);
            }
        } else if (equals(char, RIGHT)) {
            if (cursor < buf.length) {
                cursor++;
                await write(stdout, RIGHT);
            }
        } else if (isCancelEvent(char)) {
            await write(stdout, bytes([LF]));
            return null;
        } else if (char[0] === CR || char[0] === LF) {
            await write(stdout, bytes([LF]));
            return buf.join("");
        } else if (char[0] === BS || char[0] === DEL) {
            if (cursor > 0) {
                buf.splice(cursor - 1, 1);
                cursor--;
                const rest = buf.slice(cursor).join("");

                await write(stdout, LEFT);
                await write(stdout, CLR_RIGHT);

                if (rest) {
                    await write(stdout, bytes(rest));
                    await write(stdout, bytes(`\u001b[${rest.length}D`));
                }
            }
        } else {
            if (cursor === buf.length) {
                buf.push(String(char));
                cursor++;
                await write(stdout, char);
            } else {
                buf.splice(cursor, 0, String(char));
                const rest = buf.slice(cursor + 1).join("");

                cursor++;
                await write(stdout, concat(char, bytes(rest)));
                await write(stdout, bytes(`\u001b[${rest.length}D`));
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
