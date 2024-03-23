/**
 * Asynchronous dialog functions for both browsers and Node.js.
 * 
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 * 
 * @remarks Currently, this module doesn't work well in Deno since it doesn't
 * provide enough features for the `process.stdin` object.
 * 
 * @remarks This module is experimental and breaks the process in Node.js REPL
 * environment.
 * @experimental
 * 
 * @module
 */

import { stripEnd } from "@ayonli/jsext/string";
import Dialog, { closeDialog } from "./components/Dialog.ts";
import Text from "./components/Text.ts";
import Footer from "./components/Footer.ts";
import OkButton from "./components/OkButton.ts";
import CancelButton from "./components/CancelButton.ts";
import Input from "./components/Input.ts";
import Progress from "./components/Progress.ts";

declare const Deno: object;

type KeypressEventInfo = {
    sequence: string;
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
};

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
                        onPressEscape: () => resolve(),
                        onPressEnter: () => resolve(),
                    },
                    Text(message),
                    Footer(
                        OkButton({
                            onClick: () => resolve(),
                        }, "OK")
                    )
                )
            );
        });
    } else {
        const { stdin, stdout } = await import("process");
        const { createInterface } = await import("readline");
        const writer = createInterface({
            input: stdin,
            output: stdout,
        });
        await new Promise<string>(resolve => {
            writer.question(message + " [Enter] ", resolve);
        });
        writer.close();
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
                        onPressEscape: () => resolve(false),
                        onPressEnter: () => resolve(true),
                    },
                    Text(message),
                    Footer(
                        CancelButton({
                            onClick: () => resolve(false),
                        }, "Cancel"),
                        OkButton({
                            onClick: () => resolve(true)
                        }, "OK")
                    )
                )
            );
        });
    } else {
        const { stdin, stdout } = await import("process");
        const { createInterface } = await import("readline");
        const writer = createInterface({
            input: stdin,
            output: stdout,
        });
        const job = new Promise<string>(resolve => {
            writer.question(message + " [y/N] ", resolve);
        });

        const abort = new Promise<string>(resolve => {
            stdin.on?.("keypress", (_, key: KeypressEventInfo) => {
                if (key.name === "escape") {
                    resolve("N");
                }
            });
        });

        let ok = await Promise.race([job, abort]);
        writer.close();

        ok = ok.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    }
}

/**
 * Displays a dialog with a message prompting the user to input some text, and to
 * wait until the user either submits the text or cancels the dialog.
 */
export async function prompt(
    message: string,
    defaultValue: string | undefined = undefined
): Promise<string | null> {
    if (typeof Deno === "object") {
        return Promise.resolve(globalThis.prompt(message, defaultValue));
    } else if (typeof document === "object") {
        return new Promise<string | null>(resolve => {
            const handleConfirm = (_: Event, dialog: HTMLDialogElement) => {
                const input = dialog!.querySelector("input") as HTMLInputElement;
                resolve(input.value);
            };

            document.body.appendChild(
                Dialog(
                    {
                        onPressEscape: () => resolve(null),
                        onPressEnter: handleConfirm,
                    },
                    Text(message),
                    Input(defaultValue),
                    Footer(
                        CancelButton({
                            onClick: () => resolve(null),
                        }, "Cancel"),
                        OkButton({
                            onClick: handleConfirm,
                        }, "OK")
                    )
                )
            );
        });
    } else {
        const { stdin, stdout } = await import("process");
        const { createInterface } = await import("readline");
        const writer = createInterface({
            input: stdin,
            output: stdout,
        });
        const job = new Promise<string>(resolve => {
            writer.question(message + " ", resolve);
        });

        if (defaultValue) {
            writer.write(defaultValue);
        }

        const abort = new Promise<null>(resolve => {
            stdin.on?.("keypress", (_, key: KeypressEventInfo) => {
                if (key.name === "escape") {
                    resolve(null);
                }
            });
        });

        const answer = await Promise.race([job, abort]);
        writer.close();

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
        const dialog = Dialog({ onPressEscape: abort }, text);

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
                    CancelButton({ onClick: abort }, "Cancel")
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
            signal.aborted || closeDialog(dialog);
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
        const { stdin, stdout } = await import("process");
        const { createInterface, clearLine, moveCursor } = await import("readline");
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
            } else {
                waitingIndicator += ".";
                writer.write(".");
            }
        }, 1000);

        let lastMessage = stripEnd(message, "...");
        let lastPercent: number | undefined = undefined;

        const set = (state: ProgressState) => {
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
                clearInterval(waitingTimer as any);
            }
        };

        if (onAbort) {
            stdin.on?.("keypress", (_, key: KeypressEventInfo) => {
                if (key.name === "escape") {
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
        } finally {
            clearInterval(waitingTimer as any);
            writer.write("\n");
            writer.close();
        }
    }
}
