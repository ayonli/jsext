import bytes from '../bytes/index.js';
import { stripEnd } from '../string/index.js';
import CancelButton from './browser/CancelButton.js';
import Dialog, { closeDialog } from './browser/Dialog.js';
import Footer from './browser/Footer.js';
import Progress from './browser/Progress.js';
import Text from './browser/Text.js';
import { CLR, LF } from './terminal/constants.js';
import { isNodeRepl, writeSync, isCancelEvent } from './terminal/util.js';

async function handleDomProgress(message, fn, options) {
    const { signal, abort, listenForAbort } = options;
    const text = Text(message);
    const { element: progressBar, setValue } = Progress();
    const dialog = Dialog({ onCancel: abort }, text);
    const set = (state) => {
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
        dialog.appendChild(Footer(progressBar, CancelButton()));
    }
    else {
        dialog.appendChild(progressBar);
    }
    document.body.appendChild(dialog);
    let job = fn(set, signal);
    if (listenForAbort) {
        job = Promise.race([job, listenForAbort()]);
    }
    try {
        return await job;
    }
    finally {
        signal.aborted || closeDialog(dialog, "OK");
    }
}
async function handleTerminalProgress(stdin, stdout, message, fn, options) {
    const { signal, abort, listenForAbort } = options;
    writeSync(stdout, bytes(message));
    let lastMessage = stripEnd(message, "...");
    let lastPercent = undefined;
    let waitingIndicator = message.endsWith("...") ? "..." : "";
    const waitingTimer = setInterval(() => {
        if (waitingIndicator === "...") {
            waitingIndicator = ".";
        }
        else {
            waitingIndicator += ".";
        }
        writeSync(stdout, CLR);
        writeSync(stdout, bytes(lastMessage + waitingIndicator));
    }, 1000);
    const set = (state) => {
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
            clearInterval(waitingTimer);
        }
    };
    const nodeReader = (buf) => {
        if (isCancelEvent(buf)) {
            abort === null || abort === void 0 ? void 0 : abort();
        }
    };
    const denoReader = "fd" in stdin ? null : stdin.readable.getReader();
    if (abort) {
        if ("fd" in stdin) {
            stdin.on("data", nodeReader);
        }
        else {
            (async () => {
                while (true) {
                    try {
                        const { done, value } = await denoReader.read();
                        if (done || isCancelEvent(value)) {
                            signal.aborted || abort();
                            break;
                        }
                    }
                    catch (_a) {
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
    }
    finally {
        writeSync(stdout, LF);
        clearInterval(waitingTimer);
        if ("fd" in stdin) {
            stdin.off("data", nodeReader);
        }
        else {
            denoReader === null || denoReader === void 0 ? void 0 : denoReader.releaseLock();
        }
    }
}
async function handleDenoProgress(message, fn, options) {
    const { stdin, stdout } = Deno;
    if (!stdin.isTerminal) {
        return null;
    }
    stdin.setRaw(true);
    try {
        return await handleTerminalProgress(stdin, stdout, message, fn, options);
    }
    finally {
        stdin.setRaw(false);
    }
}
async function handleNodeProgress(message, fn, options) {
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
    }
    finally {
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
async function progress(message, fn, onAbort = undefined) {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let fallback = null;
    const abort = !onAbort ? undefined : async () => {
        try {
            const result = await onAbort();
            fallback = { value: result };
            ctrl.abort();
        }
        catch (err) {
            ctrl.abort(err);
        }
    };
    const listenForAbort = !onAbort ? undefined : () => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
            if (fallback) {
                resolve(fallback.value);
            }
            else {
                reject(signal.reason);
            }
        });
    });
    if (typeof document === "object") {
        return await handleDomProgress(message, fn, { signal, abort, listenForAbort });
    }
    else if (typeof Deno === "object") {
        return await handleDenoProgress(message, fn, { signal, abort, listenForAbort });
    }
    else {
        return await handleNodeProgress(message, fn, { signal, abort, listenForAbort });
    }
}

export { progress as default };
//# sourceMappingURL=progress.js.map
