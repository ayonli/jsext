import { stripEnd } from '../string/index.js';
import Dialog, { closeDialog } from './components/Dialog.js';
import Text from './components/Text.js';
import Footer from './components/Footer.js';
import OkButton from './components/OkButton.js';
import CancelButton from './components/CancelButton.js';
import Input from './components/Input.js';
import Progress from './components/Progress.js';
import { isNodeRepl, questionInRepl, handleCancel } from './util.js';

/**
 * Asynchronous dialog functions for both browsers and Node.js.
 *
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 *
 * **NOTE:** Currently, this module doesn't work well in Deno since it doesn't
 * provide enough features for the `process.stdin` object.
 *
 * **NOTE:** This module is experimental and breaks the process in Node.js REPL
 * environment.
 * @experimental
 *
 * @module
 */
/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 */
async function alert(message) {
    if (typeof Deno === "object") {
        return Promise.resolve(globalThis.alert(message));
    }
    else if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(),
                onOk: () => resolve(),
            }, Text(message), Footer(OkButton())));
        });
    }
    else if (await isNodeRepl()) {
        await questionInRepl(message + " [Enter] ");
        return;
    }
    else {
        const { createInterface } = await import('readline/promises');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        await Promise.race([rl.question(message + " [Enter] "), handleCancel()]);
        rl.close();
    }
}
/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 */
async function confirm(message) {
    if (typeof Deno === "object") {
        return Promise.resolve(globalThis.confirm(message));
    }
    else if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(false),
                onOk: () => resolve(true),
            }, Text(message), Footer(CancelButton(), OkButton())));
        });
    }
    else if (await isNodeRepl()) {
        const answer = await questionInRepl(message + " [y/N] ");
        const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    }
    else {
        const { createInterface } = await import('readline/promises');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await Promise.race([
            rl.question(message + " [y/N] "),
            handleCancel()
        ]);
        const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
        rl.close();
        return ok === "y" || ok === "yes";
    }
}
/**
 * Displays a dialog with a message prompting the user to input some text, and to
 * wait until the user either submits the text or cancels the dialog.
 */
async function prompt(message, defaultValue = "") {
    if (typeof Deno === "object") {
        return Promise.resolve(globalThis.prompt(message, defaultValue));
    }
    else if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(null),
                onOk: (dialog) => {
                    const input = dialog.querySelector("input");
                    resolve(input.value);
                },
            }, Text(message), Input(defaultValue), Footer(CancelButton(), OkButton())));
        });
    }
    else if (await isNodeRepl()) {
        return await questionInRepl(message + " ", defaultValue);
    }
    else {
        const { createInterface } = await import('readline/promises');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        if (defaultValue) {
            rl.write(defaultValue);
        }
        const answer = await Promise.race([
            rl.question(message + " "),
            handleCancel()
        ]);
        rl.close();
        return answer;
    }
}
/**
 * Displays a dialog with a progress bar indicating the ongoing state of the
 * `fn` function, and to wait until the job finishes or the user cancels the
 * dialog.
 *
 * @param onAbort If provided, the dialog will show a cancel button that allows
 * the user to abort the task. This function can either return a default/fallback
 * result or throw an error to indicate the cancellation.
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
    const abort = async () => {
        if (!onAbort)
            return;
        try {
            const result = await onAbort();
            fallback = { value: result };
            ctrl.abort();
        }
        catch (err) {
            ctrl.abort(err);
        }
    };
    const handleAbort = () => new Promise((resolve, reject) => {
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
        if (onAbort) {
            dialog.appendChild(Footer(progressBar, CancelButton()));
        }
        else {
            dialog.appendChild(progressBar);
        }
        document.body.appendChild(dialog);
        let job = fn(set, signal);
        if (onAbort) {
            job = Promise.race([job, handleAbort()]);
        }
        try {
            return await job;
        }
        finally {
            signal.aborted || closeDialog(dialog, "OK");
        }
    }
    else if (typeof Deno === "object") {
        let lastMessage = stripEnd(message, "...");
        let lastPercent = undefined;
        const set = (state) => {
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
                console.log(lastMessage + " ... " + lastPercent + "%");
            }
            else {
                console.log(lastMessage);
            }
        };
        console.log(message);
        return await fn(set, signal);
    }
    else {
        const { stdin, stdout } = process;
        const { createInterface, clearLine, moveCursor } = await import('readline');
        const writer = createInterface({
            input: stdin,
            output: stdout,
        });
        let waitingIndicator = message.endsWith("...") ? "..." : "";
        const waitingTimer = setInterval(() => {
            if (waitingIndicator === "...") {
                waitingIndicator = ".";
                moveCursor(stdout, -2, 0);
                clearLine(stdin, 1);
            }
            else {
                waitingIndicator += ".";
                writer.write(".");
            }
        }, 1000);
        let lastMessage = stripEnd(message, "...");
        let lastPercent = undefined;
        const set = (state) => {
            moveCursor(stdout, -writer.cursor, 0);
            clearLine(stdout, 1);
            if (signal.aborted) {
                return;
            }
            if (state.message) {
                lastMessage = state.message;
            }
            if (state.percent !== undefined) {
                lastPercent = state.percent;
            }
            writer.write(lastMessage);
            if (lastPercent !== undefined) {
                writer.write(" ... " + lastPercent + "%");
                clearInterval(waitingTimer);
            }
        };
        if (onAbort) {
            stdin.on("keypress", (_, key) => {
                if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                    abort();
                }
            });
        }
        writer.write(message);
        let job = fn(set, signal);
        if (onAbort) {
            job = Promise.race([job, handleAbort()]);
        }
        try {
            return await job;
        }
        finally {
            clearInterval(waitingTimer);
            writer.write("\n");
            writer.close();
        }
    }
}

export { alert, confirm, progress, prompt };
//# sourceMappingURL=index.js.map
