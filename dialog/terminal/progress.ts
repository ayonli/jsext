import bytes from "../../bytes.ts";
import { stripEnd } from "../../string.ts";
import type { ProgressFunc, ProgressState } from "../../dialog.ts";
import { CLR, LF } from "./constants.ts";
import {
    DenoStdin,
    DenoStdout,
    NodeStdin,
    NodeStdout,
    hijackNodeStdin,
    isCancelEvent,
    writeSync,
} from "./util.ts";

async function handleTerminalProgress(
    stdin: NodeStdin | DenoStdin,
    stdout: NodeStdout | DenoStdout,
    message: string,
    fn: ProgressFunc<any>,
    options: {
        signal: AbortSignal;
        abort?: (() => void) | undefined;
        listenForAbort?: (() => Promise<any>) | undefined;
    }
) {
    const { signal, abort, listenForAbort } = options;

    writeSync(stdout, bytes(message));

    let lastMessage = stripEnd(message, "...");
    let lastPercent: number | undefined = undefined;

    let waitingIndicator = message.endsWith("...") ? "..." : "";
    const waitingTimer = setInterval(() => {
        if (waitingIndicator === "...") {
            waitingIndicator = ".";
        } else {
            waitingIndicator += ".";
        }

        writeSync(stdout, CLR);
        writeSync(stdout, bytes(lastMessage + waitingIndicator));
    }, 1000);

    const set = (state: ProgressState) => {
        if (signal.aborted) {
            return;
        }

        writeSync(stdout, CLR);

        if (state.message) {
            lastMessage = state.message;
        }

        if (state.percent !== undefined) {
            lastPercent = state.percent;
        }

        writeSync(stdout, bytes(lastMessage));

        if (lastPercent !== undefined) {
            const percentage = " ... " + lastPercent + "%";

            writeSync(stdout, bytes(percentage));
            clearInterval(waitingTimer as any);
        }
    };
    const nodeReader = (buf: Uint8Array) => {
        if (isCancelEvent(buf)) {
            abort?.();
        }
    };
    const denoReader = "fd" in stdin ? null : stdin.readable.getReader();

    if (abort) {
        if ("fd" in stdin) {
            stdin.on("data", nodeReader);
        } else {
            (async () => {
                while (true) {
                    try {
                        const { done, value } = await denoReader!.read();

                        if (done || isCancelEvent(value)) {
                            signal.aborted || abort();
                            break;
                        }
                    } catch {
                        signal.aborted || abort();
                        break;
                    }
                }
            })();
        }
    }

    let job = fn(set, signal);

    if (listenForAbort) {
        job = Promise.race([job, listenForAbort()]);
    }

    try {
        return await job;
    } finally {
        writeSync(stdout, LF);
        clearInterval(waitingTimer as any);

        if ("fd" in stdin) {
            stdin.off("data", nodeReader);
        } else {
            denoReader?.releaseLock();
        }
    }
}

export async function progressInDeno<T>(message: string, fn: ProgressFunc<T>, options: {
    signal: AbortSignal;
    abort?: (() => void) | undefined;
    listenForAbort?: (() => Promise<T>) | undefined;
}): Promise<T | null> {
    const { stdin, stdout } = Deno;

    if (!stdin.isTerminal) {
        return null;
    }

    stdin.setRaw(true);

    try {
        return await handleTerminalProgress(stdin, stdout, message, fn, options);
    } finally {
        stdin.setRaw(false);
    }
}

export async function progressInNode<T>(message: string, fn: ProgressFunc<T>, options: {
    signal: AbortSignal;
    abort?: (() => void) | undefined;
    listenForAbort?: (() => Promise<T>) | undefined;
}): Promise<T | null> {
    const { stdin, stdout } = process;

    if (!stdout.isTTY) {
        return null;
    }

    return hijackNodeStdin(stdin, async () => {
        const rawMode = stdin.isRaw;
        rawMode || stdin.setRawMode(true);

        try {
            return await handleTerminalProgress(stdin, stdout, message, fn, options);
        } finally {
            stdin.setRawMode(rawMode);
        }
    });
}
