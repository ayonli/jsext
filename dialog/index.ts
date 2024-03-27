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

type KeypressEventInfo = {
    sequence: string;
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
};

type NodeStdin = NodeJS.ReadStream & { fd: 0; };

async function ownStdin<T>(stdin: NodeStdin, task: (stdin: NodeStdin) => Promise<T>) {
    const rawMode = stdin.isRaw;
    rawMode || stdin.setRawMode(true);

    const _listeners = stdin.listeners("keypress");
    stdin.removeAllListeners("keypress");

    const result = await task(stdin);

    _listeners.forEach(listener => stdin.addListener("keypress", listener as any));
    stdin.setRawMode(rawMode);

    return result;
}

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
    } else {
        const { stdin, stdout } = await import("process");
        const { createInterface } = await import("readline/promises");
        const repl = await import("repl");
        // @ts-ignore fix CommonJS import
        const isRepl = !!(repl.default ?? repl).repl;

        if (isRepl) {
            return await ownStdin(stdin, async () => {
                stdout.write(message + " [Enter] ");
                await new Promise<void>(resolve => {
                    const listener = (_: string, key: KeypressEventInfo) => {
                        if (key.name === "escape" ||
                            key.name === "enter" ||
                            key.name === "return" ||
                            (key.name === "c" && key.ctrl)
                        ) {
                            stdin.off("keypress", listener);
                            resolve();
                        }
                    };
                    stdin.on("keypress", listener);
                });
                stdout.write("\n");
            });
        }

        const rl = createInterface({ input: stdin, output: stdout });
        const job = rl.question(message + " [Enter] ");
        const abort = new Promise<string>(resolve => {
            stdin.on("keypress", (_, key: KeypressEventInfo) => {
                if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                    resolve("");
                }
            });
        });

        await Promise.race([job, abort]);
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
    } else {
        const { stdin, stdout } = await import("process");
        const { createInterface } = await import("readline/promises");
        const repl = await import("repl");
        // @ts-ignore fix CommonJS import
        const isRepl = !!(repl.default ?? repl).repl;

        if (isRepl) {
            return await ownStdin(stdin, async () => {
                stdout.write(message + " [y/N] ");
                const answer = await new Promise<string>(resolve => {
                    const buf: string[] = [];
                    const listener = (char: string, key: KeypressEventInfo) => {
                        if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                            stdin.off("keypress", listener);
                            resolve("N");
                        } else if (key.name === "enter" || key.name === "return") {
                            stdin.off("keypress", listener);
                            resolve(buf.join(""));
                        } else if (key.name === "backspace") {
                            stdout.moveCursor(-1, 0);
                            stdout.clearLine(1);
                            buf.pop();
                        } else {
                            stdout.write(char);
                            buf.push(char);
                        }
                    };
                    stdin.on("keypress", listener);
                });

                stdout.write("\n");
                const ok = answer.toLowerCase().trim();
                return ok === "y" || ok === "yes";
            });
        }

        const rl = createInterface({ input: stdin, output: stdout });
        const job = rl.question(message + " [y/N] ");
        const abort = new Promise<string>(resolve => {
            stdin.on("keypress", (_, key: KeypressEventInfo) => {
                if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                    resolve("N");
                }
            });
        });

        const answer = await Promise.race([job, abort]);
        const ok = answer.toLowerCase().trim();

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
    } else {
        const { stdin, stdout } = await import("process");
        const { createInterface } = await import("readline/promises");
        const repl = await import("repl");
        // @ts-ignore fix CommonJS import
        const isRepl = !!(repl.default ?? repl).repl;

        if (isRepl) {
            return await ownStdin(stdin, async () => {
                stdout.write(message + " ");
                const answer = await new Promise<string | null>(resolve => {
                    const buf: string[] = [];
                    const listener = (char: string, key: KeypressEventInfo) => {
                        if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                            stdin.off("keypress", listener);
                            resolve(null);
                        } else if (key.name === "enter" || key.name === "return") {
                            stdin.off("keypress", listener);
                            resolve(buf.join(""));
                        } else if (key.name === "backspace") {
                            stdout.moveCursor(-1, 0);
                            stdout.clearLine(1);
                            buf.pop();
                        } else {
                            stdout.write(char);
                            buf.push(char);
                        }
                    };
                    stdin.on("keypress", listener);
                });

                stdout.write("\n");
                return answer;
            });
        }

        const rl = createInterface({ input: stdin, output: stdout });
        const job = rl.question(message + " ");

        if (defaultValue) {
            rl.write(defaultValue);
        }

        const abort = new Promise<null>(resolve => {
            stdin.on?.("keypress", (_, key: KeypressEventInfo) => {
                if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                    resolve(null);
                }
            });
        });

        const answer = await Promise.race([job, abort]);
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
