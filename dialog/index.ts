/**
 * Asynchronous `alert`, `confirm` and `prompt` functions for both browsers and Node.js.
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
import Dialog from "./components/Dialog";
import Text from "./components/Text";
import Footer from "./components/Footer";
import OkButton from "./components/OkButton";
import CancelButton from "./components/CancelButton";
import Input from "./components/Input";
import Progress from "./components/Progress";

declare const Deno: object;

export async function alert(message: string) {
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
                        }, "Ok")
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
            stdin.on?.("keypress", (key: string | undefined) => {
                if (key === undefined) {
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
                        }, "Ok")
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
            stdin.on?.("keypress", (key: string | undefined) => {
                if (key === undefined) {
                    resolve(null);
                }
            });
        });

        const answer = await Promise.race([job, abort]);
        writer.close();

        return answer;
    }
}

export type SetProgress = (state: { percent?: number; message?: string; }) => void;

export async function progress<T>(
    message: string,
    fn: (set: SetProgress, signal?: AbortSignal) => Promise<T>,
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
        const dialog = Dialog({}, text);

        const close = () => {
            dialog.close();
            document.body.removeChild(dialog);
        };
        const set = (state: { message?: string, percent?: number; }) => {
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
            signal.aborted || close();
        }
    } else if (typeof Deno === "object") {
        let lastMessage = stripEnd(message, "...");
        let lastPercent: number | undefined = undefined;

        const set = (state: { message?: string, percent?: number; }) => {
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

        const set = (state: { message?: string, percent?: number; }) => {
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
            stdin.on?.("keypress", async (key: string | undefined) => {
                if (key === undefined) {
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
