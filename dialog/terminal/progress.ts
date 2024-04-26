import bytes, { equals } from "../../bytes.ts";
import { stripEnd } from "../../string.ts";
import type { ProgressFunc, ProgressState } from "../../dialog.ts";
import { ControlKeys, ControlSequences, writeStdoutSync } from "../../cli.ts";

const { CTRL_C, ESC, LF } = ControlKeys;
const { CLR } = ControlSequences;

export async function handleTerminalProgress(
    message: string,
    fn: ProgressFunc<any>,
    options: {
        signal: AbortSignal;
        abort?: (() => void) | undefined;
        listenForAbort?: (() => Promise<any>) | undefined;
    }
) {
    const { signal, abort, listenForAbort } = options;

    writeStdoutSync(bytes(message));

    let lastMessage = stripEnd(message, "...");
    let lastPercent: number | undefined = undefined;

    let waitingIndicator = message.endsWith("...") ? "..." : "";
    const waitingTimer = setInterval(() => {
        if (waitingIndicator === "...") {
            waitingIndicator = ".";
        } else {
            waitingIndicator += ".";
        }

        writeStdoutSync(CLR);
        writeStdoutSync(bytes(lastMessage + waitingIndicator));
    }, 1000);

    const set = (state: ProgressState) => {
        if (signal.aborted) {
            return;
        }

        writeStdoutSync(CLR);

        if (state.message) {
            lastMessage = state.message;
        }

        if (state.percent !== undefined) {
            lastPercent = state.percent;
        }

        writeStdoutSync(bytes(lastMessage));

        if (lastPercent !== undefined) {
            const percentage = " ... " + lastPercent + "%";

            writeStdoutSync(bytes(percentage));
            clearInterval(waitingTimer as any);
        }
    };
    const nodeReader = typeof Deno === "object" ? null : (buf: Uint8Array) => {
        if (equals(buf, ESC) || equals(buf, CTRL_C)) {
            abort?.();
        }
    };
    const denoReader = typeof Deno === "object" ? Deno.stdin.readable.getReader() : null;

    if (abort) {
        if (nodeReader) {
            process.stdin.on("data", nodeReader);
        } else if (denoReader) {
            (async () => {
                while (true) {
                    try {
                        const { done, value } = await denoReader.read();

                        if (done || equals(value, ESC) || equals(value, CTRL_C)) {
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
        writeStdoutSync(LF);
        clearInterval(waitingTimer as any);

        if (nodeReader) {
            process.stdin.off("data", nodeReader);
        } else if (denoReader) {
            denoReader.releaseLock();
        }
    }
}
