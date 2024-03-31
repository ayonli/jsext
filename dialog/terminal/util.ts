import { isFullWidth, isWide } from "../../external/code-point-utils/index.ts";
import bytes, { ByteArray, equals } from "../../bytes/index.ts";
import { sum } from "../../math/index.ts";
import { byteLength, chars } from "../../string/index.ts";
import { CANCEL, EMOJI_RE, ESC } from "./constants.ts";

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
    if (EMOJI_RE.test(char)) {
        const _bytes = byteLength(char);
        return _bytes === 1 || _bytes === 3 || _bytes === 6 ? 1 : 2;
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

export async function hijackNodeStdin<T>(stdin: NodeStdin, task: () => Promise<T>) {
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
