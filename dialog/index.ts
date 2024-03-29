/**
 * Asynchronous dialog functions for both browsers and Node.js.
 * 
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 * @experimental
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
import {
    listenForCancel,
    isNodeRepl,
    questionInNodeRepl,
    isDenoRepl,
    questionInDeno,
} from "./util.ts";

export { progress, ProgressState };

/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 * 
 * **NOTE**: Despite defined as an async function, in Deno REPL, this function
 * actually calls the global `alert` function directly, which is synchronous.
 */
export async function alert(message: string): Promise<void> {
    if (typeof Deno === "object") {
        if (isDenoRepl()) {
            return Promise.resolve(globalThis.alert(message));
        } else {
            await questionInDeno(message + " [Enter] ");
            return;
        }
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
        await questionInNodeRepl(message + " [Enter] ");
        return;
    } else {
        const { createInterface } = await import("readline");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const { signal, promise, cleanup } = listenForCancel();

        await Promise.race([
            new Promise<string>(resolve => {
                rl.question(message + " [Enter] ", { signal }, resolve);
            }),
            promise
        ]);
        cleanup();
        rl.close();
    }
}

/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 * 
 * **NOTE**: Despite defined as an async function, in Deno REPL, this function
 * actually calls the global `confirm` function directly, which is synchronous.
 */
export async function confirm(message: string): Promise<boolean> {
    if (typeof Deno === "object") {
        if (isDenoRepl()) {
            return Promise.resolve(globalThis.confirm(message));
        } else {
            const answer = await questionInDeno(message + " [y/N] ");
            const ok = answer?.toLowerCase().trim();
            return ok === "y" || ok === "yes";
        }
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
        const answer = await questionInNodeRepl(message + " [y/N] ");
        const ok = answer?.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    } else {
        const { createInterface } = await import("readline");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const { signal, promise, cleanup } = listenForCancel();
        const answer = await Promise.race([
            new Promise<string>(resolve => {
                rl.question(message + " [y/N] ", { signal }, resolve);
            }),
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
 * 
 * **NOTE**: Despite defined as an async function, in Deno REPL, this function
 * actually calls the global `prompt` function directly, which is synchronous.
 */
export async function prompt(
    message: string,
    defaultValue: string = ""
): Promise<string | null> {
    if (typeof Deno === "object") {
        if (isDenoRepl()) {
            return Promise.resolve(globalThis.prompt(message, defaultValue));
        } else {
            return await questionInDeno(message + " ", defaultValue);
        }
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
        return await questionInNodeRepl(message + " ", defaultValue);
    } else {
        const { createInterface } = await import("readline");
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const { signal, promise, cleanup } = listenForCancel();
        const job = new Promise<string>(resolve => {
            rl.question(message + " ", { signal }, resolve);
        });

        if (defaultValue) {
            rl.write(defaultValue);
        }

        const answer = await Promise.race([job, promise]);

        cleanup();
        rl.close();

        return answer;
    }
}
