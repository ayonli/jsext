import bytes from "../bytes/index.ts";
import { stripEnd } from "../string/index.ts";
import CancelButton from "./components/CancelButton.ts";
import Dialog, { closeDialog } from "./components/Dialog.ts";
import Footer from "./components/Footer.ts";
import Progress from "./components/Progress.ts";
import Text from "./components/Text.ts";
import { KeypressEventInfo, isNodeRepl } from "./util.ts";

const ESC = "\u001b".charCodeAt(0); // Escape
const CLR = bytes("\r\u001b[K"); // Clear the current line

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

export type ProgressHandler<T> = (set: (state: ProgressState) => void, signal: AbortSignal) => Promise<T>;

async function handleDomProgress<T>(message: string, fn: ProgressHandler<T>, options: {
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

async function handleDenoProgress<T>(message: string, fn: ProgressHandler<T>, options: {
    signal: AbortSignal;
    abort?: (() => void) | undefined;
    listenForAbort?: (() => Promise<T>) | undefined;
}) {
    const { signal, abort, listenForAbort } = options;
    const { stdin, stdout } = Deno;

    stdout.writeSync(bytes(message));

    let lastMessage = stripEnd(message, "...");
    let lastPercent: number | undefined = undefined;

    let waitingIndicator = message.endsWith("...") ? "..." : "";
    const waitingTimer = setInterval(() => {
        if (waitingIndicator === "...") {
            waitingIndicator = ".";
        } else {
            waitingIndicator += ".";
        }

        stdout.writeSync(CLR);
        stdout.writeSync(bytes(lastMessage + waitingIndicator));
    }, 1000);

    const set = (state: ProgressState) => {
        stdout.writeSync(CLR);

        if (signal.aborted) {
            return;
        }

        if (state.message) {
            lastMessage = state.message;
        }

        if (state.percent !== undefined) {
            lastPercent = state.percent;
        }

        stdout.writeSync(bytes(lastMessage));

        if (lastPercent !== undefined) {
            const percentage = " ... " + lastPercent + "%";

            stdout.writeSync(bytes(percentage));
            clearInterval(waitingTimer as any);
        }
    };
    const keypressListener = new AbortController();
    const finish = new Promise<null>(resolve => {
        keypressListener.signal.addEventListener("abort", () => {
            resolve(null);
        });
    });

    if (abort) {
        (async () => {
            stdin.setRaw(true, { cbreak: true });
            const c = new Uint8Array(1);

            while (true) {
                const n = await Promise.race([stdin.read(c), finish]);
                if (n === null || n === 0) {
                    break;
                } else if (c[0] === ESC) {
                    abort();
                    break;
                }
            }

            stdin.setRaw(false);
        })();
    }

    let job = fn(set, signal);

    if (listenForAbort) {
        job = Promise.race([job, listenForAbort()]);
    }

    try {
        return await job;
    } finally {
        clearInterval(waitingTimer as any);
        keypressListener.abort();
        stdout.writeSync(bytes("\n"));
    }
}

async function handleNodeProgress<T>(message: string, fn: ProgressHandler<T>, options: {
    signal: AbortSignal;
    abort?: (() => void) | undefined;
    listenForAbort?: (() => Promise<T>) | undefined;
}) {
    const { signal, abort, listenForAbort } = options;
    const { stdin, stdout } = process;
    const handleProgress = async () => {
        let cursor = message.length;
        stdout.write(message);

        let waitingIndicator = message.endsWith("...") ? "..." : "";
        const waitingTimer = setInterval(() => {
            if (waitingIndicator === "...") {
                waitingIndicator = ".";
                cursor -= 2;
                stdout.moveCursor(-2, 0);
                stdout.clearLine(1);
            } else {
                waitingIndicator += ".";
                cursor += 1;
                stdout.write(".");
            }
        }, 1000);

        let lastMessage = stripEnd(message, "...");
        let lastPercent: number | undefined = undefined;

        const set = (state: ProgressState) => {
            if (signal.aborted) {
                return;
            }

            stdout.moveCursor(-cursor, 0);
            stdout.clearLine(1);

            if (state.message) {
                lastMessage = state.message;
            }

            if (state.percent !== undefined) {
                lastPercent = state.percent;
            }

            cursor = lastMessage.length;
            stdout.write(lastMessage);

            if (lastPercent !== undefined) {
                const percentage = " ... " + lastPercent + "%";

                cursor += percentage.length;
                stdout.write(percentage);
                clearInterval(waitingTimer as any);
            }
        };

        const keypressListener = (_: string, key: KeypressEventInfo) => {
            if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                abort?.();
            }
        };

        if (abort) {
            stdin.on("keypress", keypressListener);
        }

        let job = fn(set, signal);

        if (listenForAbort) {
            job = Promise.race([job, listenForAbort()]);
        }

        try {
            return await job;
        } finally {
            clearInterval(waitingTimer as any);
            abort && stdin.off("keypress", keypressListener);
            stdout.write("\n");
        }
    };

    if (await isNodeRepl()) {
        return await handleProgress();
    } else {
        const { createInterface } = await import("readline");
        // this will keep the program running
        const rl = createInterface({ input: stdin, output: stdout });
        const result = await handleProgress();

        rl.close();
        return result;
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
    fn: (set: (state: ProgressState) => void, signal: AbortSignal) => Promise<T>,
    onAbort: (() => T | never | Promise<T | never>) | undefined = undefined
): Promise<T> {
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
