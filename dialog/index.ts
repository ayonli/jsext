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

import { stripEnd } from "../string/index.ts";
import Dialog, { closeDialog } from "./components/Dialog.ts";
import Text from "./components/Text.ts";
import Footer from "./components/Footer.ts";
import OkButton from "./components/OkButton.ts";
import CancelButton from "./components/CancelButton.ts";
import Input from "./components/Input.ts";
import Progress from "./components/Progress.ts";
import { KeypressEventInfo, handleCancel, isNodeRepl, questionInRepl } from "./util.ts";

/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 */
export async function alert(message: string): Promise<void> {
    if (typeof Deno === "object") {
        return Promise.resolve(globalThis.alert(message));
    } else if (typeof document === "object") {
        return new Promise<void>(resolve => {
            document.body.appendChild(
                Dialog(
                    {
                        onCancel: () => resolve(),
                        onOk: () => resolve(),
                    },
                    Text(message),
                    Footer(
                        OkButton()
                    )
                )
            );
        });
    } else if (await isNodeRepl()) {
        await questionInRepl(message + " [Enter] ");
        return;
    } else {
        const { createInterface } = await import("readline/promises");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        await Promise.race([rl.question(message + " [Enter] "), handleCancel()]);
        rl.close();
    }
}

/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 */
export async function confirm(message: string): Promise<boolean> {
    if (typeof Deno === "object") {
        return Promise.resolve(globalThis.confirm(message));
    } else if (typeof document === "object") {
        return new Promise<boolean>(resolve => {
            document.body.appendChild(
                Dialog(
                    {
                        onCancel: () => resolve(false),
                        onOk: () => resolve(true),
                    },
                    Text(message),
                    Footer(
                        CancelButton(),
                        OkButton()
                    )
                )
            );
        });
    } else if (await isNodeRepl()) {
        const answer = await questionInRepl(message + " [y/N] ");
        const ok = answer?.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    } else {
        const { createInterface } = await import("readline/promises");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await Promise.race([
            rl.question(message + " [y/N] "),
            handleCancel()
        ]);
        const ok = answer?.toLowerCase().trim();

        rl.close();
        return ok === "y" || ok === "yes";
    }
}

/**
 * Displays a dialog with a message prompting the user to input some text, and to
 * wait until the user either submits the text or cancels the dialog.
 */
export async function prompt(
    message: string,
    defaultValue: string = ""
): Promise<string | null> {
    if (typeof Deno === "object") {
        return Promise.resolve(globalThis.prompt(message, defaultValue));
    } else if (typeof document === "object") {
        return new Promise<string | null>(resolve => {
            document.body.appendChild(
                Dialog(
                    {
                        onCancel: () => resolve(null),
                        onOk: (dialog: HTMLDialogElement) => {
                            const input = dialog.querySelector("input") as HTMLInputElement;
                            resolve(input.value);
                        },
                    },
                    Text(message),
                    Input(defaultValue),
                    Footer(
                        CancelButton(),
                        OkButton()
                    )
                )
            );
        });
    } else if (await isNodeRepl()) {
        return await questionInRepl(message + " ", defaultValue);
    } else {
        const { createInterface } = await import("readline/promises");
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

/**
 * Displays a dialog with a progress bar indicating the ongoing state of the
 * `fn` function, and to wait until the job finishes or the user cancels the
 * dialog.
 * 
 * @param onAbort If provided, the dialog will show a cancel button that allows
 * the user to abort the task. This function can either return a default/fallback
 * result or throw an error to indicate the cancellation.
 * 
 * @experimental
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
export async function progress<T>(
    message: string,
    fn: (set: (state: ProgressState) => void, signal: AbortSignal) => Promise<T>,
    onAbort: (() => T | never | Promise<T | never>) | undefined = undefined
): Promise<T> {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let fallback: { value: T; } | null = null;
    const abort = async () => {
        if (!onAbort)
            return;

        try {
            const result = await onAbort();
            fallback = { value: result };
            ctrl.abort();
        } catch (err) {
            ctrl.abort(err);
        }
    };
    const handleAbort = () => new Promise<T>((resolve, reject) => {
        signal.addEventListener("abort", () => {
            if (fallback) {
                resolve(fallback.value);
            } else {
                reject(signal.reason);
            }
        });
    });

    if (typeof document === "object") {
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

        if (onAbort) {
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

        if (onAbort) {
            job = Promise.race([job, handleAbort()]);
        }

        try {
            return await job;
        } finally {
            signal.aborted || closeDialog(dialog, "OK");
        }
    } else if (typeof Deno === "object") {
        let lastMessage = stripEnd(message, "...");
        let lastPercent: number | undefined = undefined;

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
                console.log(lastMessage + " ... " + lastPercent + "%");
            } else {
                console.log(lastMessage);
            }
        };

        console.log(message);
        return await fn(set, signal);
    } else {
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
                stdout.moveCursor(-cursor, 0);
                stdout.clearLine(1);

                if (signal.aborted) {
                    return;
                }

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

            if (onAbort) {
                stdin.on("keypress", (_, key: KeypressEventInfo) => {
                    if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                        abort();
                    }
                });
            }

            let job = fn(set, signal);

            if (onAbort) {
                job = Promise.race([job, handleAbort()]);
            }

            try {
                return await job;
            } finally {
                clearInterval(waitingTimer as any);
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
}
