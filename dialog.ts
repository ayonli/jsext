/**
 * Asynchronous dialog functions for both browsers and terminals.
 * 
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 * @experimental
 * @module
 */

import progress from "./dialog/progress.ts";
import type { ProgressState, ProgressFunc, ProgressAbortHandler } from "./dialog/progress.ts";
import { openFile, pickFile, pickFiles, pickDirectory, saveFile } from "./dialog/file.ts";
import { alertInBrowser, confirmInBrowser, promptInBrowser } from "./dialog/browser/index.ts";
import alertInTerminal from "./dialog/terminal/alert.ts";
import confirmInTerminal from "./dialog/terminal/confirm.ts";
import promptInTerminal from "./dialog/terminal/prompt.ts";

export { openFile, pickFile, pickFiles, pickDirectory, saveFile };
export { progress, ProgressState, ProgressFunc, ProgressAbortHandler };

/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 */
export async function alert(message: string, options: {
    /** Prefer to show a GUI dialog even in the terminal. */
    preferGUI?: boolean;
} = {}): Promise<void> {
    if (typeof document === "object") {
        await alertInBrowser(message);
    } else {
        await alertInTerminal(message, options);
    }
}

/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 */
export async function confirm(message: string, options: {
    /** Prefer to show a GUI dialog even in the terminal. */
    preferGUI?: boolean;
} = {}): Promise<boolean> {
    if (typeof document === "object") {
        return await confirmInBrowser(message);
    } else {
        return await confirmInTerminal(message, options);
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
         * 
         * This option is ignored when `preferGUI` is `true`.
         */
        mask?: string;
        /** Prefer to show a GUI dialog even in the terminal. */
        preferGUI?: boolean;
    }
): Promise<string | null>;
export async function prompt(
    message: string,
    options: string | {
        defaultValue?: string | undefined;
        type?: "text" | "password";
        mask?: string;
        preferGUI?: boolean;
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
    const preferGUI = typeof options === "object" ? (options.preferGUI ?? false) : false;

    if (typeof document === "object") {
        return await promptInBrowser(message, { type, defaultValue });
    } else {
        return await promptInTerminal(message, { defaultValue, type, mask, preferGUI });
    }
}
