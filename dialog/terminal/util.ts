import { isFullWidth, isWide } from "../../external/code-point-utils/index.ts";
import bytes, { ByteArray, equals } from "../../bytes.ts";
import { sum } from "../../math.ts";
import { byteLength, chars, isEmoji } from "../../string.ts";
import { CANCEL, ESC } from "./constants.ts";

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

function charWidth(char: string) {
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

function strWidth(str: string) {
    return sum(...chars(str).map(charWidth));
}

export function toLeft(str: string) {
    return bytes(`\u001b[${strWidth(str)}D`);
}

export function toRight(str: string) {
    return bytes(`\u001b[${strWidth(str)}C`);
}

export async function read(stdin: NodeStdin | DenoStdin): Promise<ByteArray> {
    if ("fd" in stdin) {
        return new Promise<ByteArray>(resolve => {
            const listener = (chunk: Buffer) => {
                stdin.removeListener("data", listener);
                resolve(bytes(chunk));
            };
            stdin.on("data", listener);
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

export async function hijackNodeStdin<T>(stdin: NodeStdin, task: () => Promise<T>) {
    if (stdin.isPaused()) {
        stdin.resume();
    }

    const listeners = [...stdin.listeners("data")]; // copy listeners in cased being modified

    if (listeners?.length) {
        stdin.removeAllListeners("data");
    }

    try {
        return await task();
    } finally {
        if (listeners?.length) {
            listeners.forEach(listener => stdin.addListener("data", listener as any));
        } else {
            stdin.pause();
        }
    }
}

export function escape(str: string) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
