/**
 * Asynchronous dialog functions for both browsers and Node.js.
 * 
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 * @experimental
 * @module
 */

import progress from "./progress.ts";
import type { ProgressState, ProgressFunc, ProgressAbortHandler } from "./progress.ts";
import { alertInBrowser, confirmInBrowser, promptInBrowser } from "./browser/index.ts";
import { questionInDeno, questionInNode, questionInNodeRepl } from "./terminal/index.ts";
import { isNodeRepl } from "./terminal/util.ts";

export { progress, ProgressState, ProgressFunc, ProgressAbortHandler };

/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 */
export async function alert(message: string): Promise<void> {
    if (typeof document === "object") {
        await alertInBrowser(message);
    } else if (typeof Deno === "object") {
        await questionInDeno(message + " [Enter] ");
    } else if (await isNodeRepl()) {
        await questionInNodeRepl(message + " [Enter] ");
    } else {
        await questionInNodeRepl(message + " [Enter] ");
    }
}

/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 */
export async function confirm(message: string): Promise<boolean> {
    if (typeof document === "object") {
        return await confirmInBrowser(message);
    } else {
        let answer: string | null;

        if (typeof Deno === "object") {
            answer = await questionInDeno(message + " [y/N] ");
        } else if (await isNodeRepl()) {
            answer = await questionInNodeRepl(message + " [y/N] ");
        } else {
            answer = await questionInNode(message + " [y/N] ");
        }

        const ok = answer?.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    }
}

/**
 * Displays a dialog with a message prompting the user to input some text, and to
 * wait until the user either submits the text or cancels the dialog.
 */
export async function prompt(
    message: string,
    defaultValue?: string | undefined
): Promise<string | null>;
export async function prompt(
    message: string,
    options?: {
        defaultValue?: string | undefined;
        type?: "text" | "password";
        /**
         * Terminal only, used when `type` is `password`. The default value is
         * `*`, use an empty string if you don't want to show any character.
         */
        mask?: string;
    }
): Promise<string | null>;
export async function prompt(
    message: string,
    options: string | {
        defaultValue?: string | undefined;
        type?: "text" | "password";
        mask?: string;
    } = ""
): Promise<string | null> {
    const defaultValue = typeof options === "string"
        ? options
        : options.defaultValue;
    const type = typeof options === "object"
        ? options.type ?? "text"
        : "text";
    const mask = type === "password"
        ? typeof options === "object" ? (options.mask ?? "*") : "*"
        : undefined;

    if (typeof document === "object") {
        return await promptInBrowser(message, { type, defaultValue });
    } else if (typeof Deno === "object") {
        return await questionInDeno(message + " ", { defaultValue, mask });
    } else if (await isNodeRepl()) {
        return await questionInNodeRepl(message + " ", { defaultValue, mask });
    } else {
        return await questionInNode(message + " ", { defaultValue, mask });
    }
}
