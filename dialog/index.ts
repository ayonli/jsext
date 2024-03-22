/**
 * Asynchronous `alert`, `confirm` and `prompt` functions for both browsers and Node.js.
 * 
 * @remarks Currently, this module doesn't work well in Deno since it doesn't
 * provide enough features of the `process.stdin` object.
 * 
 * @remarks This module is experimental and has obvious issues in the Node.js
 * REPL environment.
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
    }

    const { stdin, stdout } = await import("process");
    const { createInterface } = await import("readline");
    // @ts-ignore
    const { default: repl } = await import("repl");
    const writer = createInterface({
        input: stdin,
        output: stdout,
    });
    await new Promise<string>(resolve => {
        writer.question(message + " [Enter] ", resolve);
    });
    writer.close();

    if (repl.repl) {
        stdin.resume(); // resume stdin to prevent the REPL from closing
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
    }

    const { stdin, stdout } = await import("process");
    const { createInterface } = await import("readline");
    // @ts-ignore
    const { default: repl } = await import("repl");
    const writer = createInterface({
        input: stdin,
        output: stdout,
    });
    const job = new Promise<string>(resolve => {
        writer.question(message + " [y/N] ", resolve);
    });

    const abort = new Promise<boolean>(resolve => {
        stdin.on?.("keypress", (key: string | undefined) => {
            if (key === undefined) {
                resolve(false);
            }
        });
    });

    let ok = await Promise.race([job, abort]);
    writer.close();

    if (repl.repl) {
        stdin.resume(); // resume stdin to prevent the REPL from closing
    }

    if (typeof ok === "boolean") {
        return false;
    } else {
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
            document.body.appendChild(
                Dialog(
                    {
                        onPressEscape: () => resolve(null),
                        onPressEnter: (_, dialog) => {
                            const input = dialog!.querySelector("input") as HTMLInputElement;
                            resolve(input.value);
                        },
                    },
                    Text(message),
                    Input(defaultValue),
                    Footer(
                        CancelButton({
                            onClick: () => resolve(null),
                        }, "Cancel"),
                        OkButton({
                            onClick: (_, dialog) => {
                                const input = dialog!.querySelector("input") as HTMLInputElement;
                                resolve(input.value);
                            },
                        }, "Ok")
                    )
                )
            );
        });
    }

    const { stdin, stdout } = await import("process");
    const { createInterface } = await import("readline");
    // @ts-ignore
    const { default: repl } = await import("repl");
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

    const response = await Promise.race([job, abort]);
    writer.close();

    if (repl.repl) {
        stdin.resume(); // resume stdin to prevent the REPL from closing
    }

    return response;
}

export async function progress<T>(
    message: string,
    fn: (set: (data: { message?: string, percent?: number; }) => void) => Promise<T>
): Promise<T> {
    if (typeof document === "object") {
        const text = Text(message);
        const progressBar = Progress();
        const dialog = Dialog({}, text, progressBar);
        const close = () => {
            dialog.close();
            document.body.removeChild(dialog);
        };
        const set = (data: { message?: string, percent?: number; }) => {
            if (data.message) {
                text.textContent = data.message;
            }

            if (data.percent !== undefined) {
                progressBar.value = data.percent;
            }
        };

        document.body.appendChild(dialog);

        return fn(set).then(result => {
            dialog.removeChild(progressBar);

            return new Promise<T>(resolve => {
                dialog.addEventListener("cancel", close);
                dialog.addEventListener("keypress", (event) => {
                    if (event.key === "Enter") {
                        close();
                    }
                });

                dialog.appendChild(
                    Footer(
                        OkButton({
                            onClick: () => resolve(result),
                        }, "OK")
                    )
                );
            });
        }).catch(err => {
            close();
            throw err;
        });
    } else if (typeof Deno === "object") {
        console.log(message);

        let lastMessage = stripEnd(message, "...");
        let lastPercent: number | undefined = undefined;

        const set = (data: { message?: string, percent?: number; }) => {
            if (data.message) {
                lastMessage = data.message;
            }

            if (data.percent !== undefined) {
                lastPercent = data.percent;
            }

            if (lastPercent !== undefined) {
                console.log(lastMessage + " ... " + lastPercent + "%");
            } else {
                console.log(lastMessage);
            }
        };

        return fn(set);
    }

    const { stdin, stdout } = await import("process");
    const { createInterface, clearLine, moveCursor } = await import("readline");
    const writer = createInterface({
        input: stdin,
        output: stdout,
    });

    writer.write(message);

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

    const set = (data: { message?: string, percent?: number; }) => {
        moveCursor(stdout, -writer.cursor, 0);
        clearLine(stdout, 1);

        if (data.message) {
            lastMessage = data.message;
        }

        if (data.percent !== undefined) {
            lastPercent = data.percent;
        }

        writer.write(lastMessage);

        if (lastPercent !== undefined) {
            writer.write(" ... " + lastPercent + "%");
            clearInterval(waitingTimer as any);
        }
    };

    const job = fn(set);

    try {
        const result = await job;

        clearInterval(waitingTimer as any);
        writer.write("\n");
        writer.close();

        return result;
    } catch (err) {
        clearInterval(waitingTimer as any);
        writer.write("\n");
        writer.close();

        throw err;
    }
}
