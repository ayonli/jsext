import bytes from "../bytes/index.ts";
import { stripEnd } from "../string/index.ts";
import CancelButton from "./components/CancelButton.ts";
import Dialog, { closeDialog } from "./components/Dialog.ts";
import Footer from "./components/Footer.ts";
import Progress from "./components/Progress.ts";
import Text from "./components/Text.ts";
import { CLR, LF } from "./terminal/constants.ts";
import {
    DenoStdin,
    DenoStdout,
    NodeStdin,
    NodeStdout,
    isCancelEvent,
    isNodeRepl,
    writeSync,
} from "./terminal/util.ts";

export type ProgressState = {
    /**
     * Once set, the progress bar will be updated to display the given
     * percentage. Valid values are between `0` and `100`.
     */
    percent?: number;
    /**
     * Once set, the progress dialog will be updated to display the given message.
     */
    message?: string;
};

export type ProgressFunc<T> = (set: (state: ProgressState) => void, signal: AbortSignal) => Promise<T>;
export type ProgressAbortHandler<T> = () => T | never | Promise<T | never>;

async function handleDomProgress<T>(message: string, fn: ProgressFunc<T>, options: {
    signal: AbortSignal;
    abort?: (() => void) | undefined;
    listenForAbort?: (() => Promise<T>) | undefined;
}) {
    const { signal, abort, listenForAbort } = options;
    const text = Text(message);
    const { element: progressBar, setValue } = Progress();
    const dialog = Dialog({ onCancel: abort }, text);

    const set = (state: ProgressState) => {
        if (signal.aborted) {
            return;
        }

        if (state.message) {
            text.textContent = state.message;
        }

        if (state.percent !== undefined) {
            setValue(state.percent);
        }
    };

    if (abort) {
        dialog.appendChild(
            Footer(
                progressBar,
                CancelButton()
            )
        );
    } else {
        dialog.appendChild(progressBar);
    }

    document.body.appendChild(dialog);
    let job = fn(set, signal);

    if (listenForAbort) {
        job = Promise.race([job, listenForAbort()]);
    }

    try {
        return await job;
    } finally {
        signal.aborted || closeDialog(dialog, "OK");
    }
}

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

async function handleDenoProgress<T>(message: string, fn: ProgressFunc<T>, options: {
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

async function handleNodeProgress<T>(message: string, fn: ProgressFunc<T>, options: {
    signal: AbortSignal;
    abort?: (() => void) | undefined;
    listenForAbort?: (() => Promise<T>) | undefined;
}): Promise<T | null> {
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
        return await handleTerminalProgress(stdin, stdout, message, fn, options);
    } finally {
        stdin.setRawMode(rawMode);

        if (!(await isNodeRepl())) {
            stdin.pause();
        }
    }
}

/**
 * Displays a dialog with a progress bar indicating the ongoing state of the
 * `fn` function, and to wait until the job finishes or the user cancels the
 * dialog.
 * 
 * @param onAbort If provided, the dialog will show a cancel button (or listen
 * for Escape in CLI) that allows the user to abort the task. This function can
 * either return a default/fallback result or throw an error to indicate the
 * cancellation.
 * 
 * @example
 * ```ts
 * // default usage
 * import { progress } from "@ayonli/jsext/dialog";
 * 
 * const result = await progress("Processing...", async () => {
 *     // ... some long-running task
 *     return { ok: true };
 * });
 * 
 * console.log(result); // { ok: true }
 * ```
 * 
 * @example
 * ```ts
 * // update state
 * import { progress } from "@ayonli/jsext/dialog";
 * 
 * const result = await progress("Processing...", async (set) => {
 *     set({ percent: 0 });
 *     // ... some long-running task
 *     set({ percent: 50, message: "Halfway there!" });
 *     // ... some long-running task
 *     set({ percent: 100 });
 * 
 *     return { ok: true };
 * });
 * 
 * console.log(result); // { ok: true }
 * ```
 * 
 * @example
 * ```ts
 * // abortable
 * import { progress } from "@ayonli/jsext/dialog";
 * 
 * const result = await progress("Processing...", async (set, signal) => {
 *     set({ percent: 0 });
 * 
 *     if (!signal.aborted) {
 *         // ... some long-running task
 *         set({ percent: 50, message: "Halfway there!" });
 *     }
 * 
 *     if (!signal.aborted) {
 *         // ... some long-running task
 *         set({ percent: 100 });
 *     }
 * 
 *     return { ok: true };
 * }, () => {
 *     return { ok: false };
 * });
 * 
 * console.log(result); // { ok: true } or { ok: false }
 * ```
 */
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

    if (typeof document === "object") {
        return await handleDomProgress(message, fn, { signal, abort, listenForAbort });
    } else if (typeof Deno === "object") {
        return await handleDenoProgress(message, fn, { signal, abort, listenForAbort });
    } else {
        return await handleNodeProgress(message, fn, { signal, abort, listenForAbort });
    }
}
