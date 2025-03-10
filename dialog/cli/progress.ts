import bytes, { equals } from "../../bytes.ts";
import {
    ControlKeys,
    ControlSequences,
    getWindowSize,
    lockStdin,
    stringWidth,
    writeStdoutSync,
} from "../../cli.ts";
import type { ProgressAbortHandler, ProgressFunc, ProgressState } from "../progress.ts";

const { CTRL_C, ESC, LF } = ControlKeys;
const { CLR } = ControlSequences;
const ongoingIndicators = [
    "      ",
    "=     ",
    "==    ",
    "===   ",
    " ===  ",
    "  === ",
    "   ===",
    "    ==",
    "     =",
    "      ",
];

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
    let lastMessage = message;
    let lastPosition = 0;
    let lastPercent: number | undefined = undefined;

    const renderSimpleBar = (position: number | undefined = undefined) => {
        position ??= lastPosition++;
        const ongoingIndicator = ongoingIndicators[position];

        writeStdoutSync(CLR);
        writeStdoutSync(bytes(`${lastMessage} [${ongoingIndicator}]`));

        if (lastPosition === ongoingIndicators.length) {
            lastPosition = 0;
        }
    };
    const renderPercentageBar = (percent: number) => {
        const { width } = getWindowSize();
        const percentage = percent + "%";
        const barWidth = width - stringWidth(lastMessage) - percentage.length - 5;
        const filled = "".padStart(Math.floor(barWidth * percent / 100), "#");
        const empty = "".padStart(barWidth - filled.length, "-");

        writeStdoutSync(CLR);
        writeStdoutSync(bytes(`${lastMessage} [${filled}${empty}] ${percentage}`));
    };

    renderSimpleBar();
    const waitingTimer = setInterval(renderSimpleBar, 200);
    const set = (state: ProgressState) => {
        if (signal.aborted) {
            return;
        }

        if (state.message) {
            lastMessage = state.message;
        }

        if (state.percent !== undefined) {
            lastPercent = state.percent;
        }

        if (lastPercent !== undefined) {
            renderPercentageBar(lastPercent);
            clearInterval(waitingTimer);
        } else if (state.message) {
            renderSimpleBar(lastPosition);
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

                denoReader.releaseLock();
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
        clearInterval(waitingTimer);

        if (nodeReader) {
            process.stdin.off("data", nodeReader);
        } else if (denoReader) {
            denoReader.releaseLock();
        }
    }
}

export default async function progress<T>(
    message: string,
    fn: ProgressFunc<T>,
    onAbort: ProgressAbortHandler<T> | undefined = undefined
): Promise<T | null> {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let fallback: { value: T; } | null = null;
    const abort = !onAbort ? undefined : async () => {
        try {
            const result = await onAbort();
            fallback = { value: result };
            ctrl.abort();
        } catch (err) {
            ctrl.abort(err);
        }
    };
    const listenForAbort = !onAbort ? undefined : () => new Promise<T>((resolve, reject) => {
        signal.addEventListener("abort", () => {
            if (fallback) {
                resolve(fallback.value);
            } else {
                reject(signal.reason);
            }
        });
    });

    return await lockStdin(() => handleTerminalProgress(message, fn, {
        signal,
        abort,
        listenForAbort,
    }));
}
