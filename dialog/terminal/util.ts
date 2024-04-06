import { isFullWidth, isWide } from "../../external/code-point-utils/index.ts";
import bytes, { ByteArray, equals, text } from "../../bytes.ts";
import { sum } from "../../math.ts";
import { byteLength, chars } from "../../string.ts";
import { CANCEL, EMOJI_RE, ESC } from "./constants.ts";
import { isNode } from "../../parallel/constants.ts";

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

export type WellKnownPlatforms = "android" | "darwin" | "freebsd" | "linux" | "netbsd" | "solaris" | "windows";
export const WellKnownPlatforms: WellKnownPlatforms[] = [
    "android",
    "darwin",
    "freebsd",
    "linux",
    "netbsd",
    "solaris",
    "windows",
];

export function platform(): WellKnownPlatforms | "others" {
    if (typeof Deno === "object") {
        if (WellKnownPlatforms.includes(Deno.build.os as any)) {
            return Deno.build.os as WellKnownPlatforms;
        } else {
            return "others";
        }
    } else if (process.platform === "win32") {
        return "windows";
    } else if (process.platform === "sunos") {
        return "solaris";
    } else if (WellKnownPlatforms.includes(process.platform as any)) {
        return process.platform as WellKnownPlatforms;
    } else {
        return "others";
    }
}

export function escape(str: string) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function run(cmd: string, args: string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    if (typeof Deno === "object") {
        const _cmd = new Deno.Command(cmd, { args });
        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: text(stdout),
            stderr: text(stderr),
        };
    } else if (isNode) {
        const { spawn } = await import("child_process");
        const child = spawn(cmd, args);
        const stdout: string[] = [];
        const stderr: string[] = [];

        child.stdout.on("data", chunk => stdout.push(String(chunk)));
        child.stderr.on("data", chunk => stderr.push(String(chunk)));

        const code = await new Promise<number>((resolve) => {
            child.on("exit", (code, signal) => {
                if (code === null && signal) {
                    resolve(1);
                } else {
                    resolve(code ?? 0);
                }
            });
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
