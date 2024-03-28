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

import Dialog from "./components/Dialog.ts";
import Text from "./components/Text.ts";
import Footer from "./components/Footer.ts";
import OkButton from "./components/OkButton.ts";
import CancelButton from "./components/CancelButton.ts";
import Input from "./components/Input.ts";
import progress from "./progress.ts";
import type { ProgressState } from "./progress.ts";
import { listenForCancel, isNodeRepl, questionInRepl } from "./util.ts";

export { progress, ProgressState };

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
        const { signal, promise, cleanup } = listenForCancel();

        await Promise.race([
            rl.question(message + " [Enter] ", { signal }),
            promise
        ]);
        cleanup();
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
        const { signal, promise, cleanup } = listenForCancel();
        const answer = await Promise.race([
            rl.question(message + " [y/N] ", { signal }),
            promise,
        ]);
        const ok = answer?.toLowerCase().trim();

        cleanup();
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
        const { signal, promise, cleanup } = listenForCancel();
        const job = rl.question(message + " ", { signal });

        if (defaultValue) {
            rl.write(defaultValue);
        }

        const answer = await Promise.race([job, promise]);

        cleanup();
        rl.close();

        return answer;
    }
}
