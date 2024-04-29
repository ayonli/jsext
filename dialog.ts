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
import { isBrowserWindow, isDeno, isNodeLike } from "./env.ts";

export { openFile, pickFile, pickFiles, pickDirectory, saveFile };
export { progress, ProgressState, ProgressFunc, ProgressAbortHandler };

/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 */
export async function alert(message: string, options: {
    /**
     * By default, a GUI dialog is displayed in the browser, and text mode is
     * used in the terminal. Set this option to `true` will force the program
     * to always display a GUI dialog, even in the terminal.
     * 
     * When in the terminal, the GUI dialog is rendered with the OS's native
     * dialog. If the dialog is failed to display, an error will be thrown.
     * 
     * This option is only functional in `Windows`, `macOS` and `Linux`, it is
     * ignored in other platforms and the browser.
     */
    gui?: boolean;
} = {}): Promise<void> {
    if (isBrowserWindow) {
        await alertInBrowser(message);
    } else if (isDeno || isNodeLike) {
        await alertInTerminal(message, options);
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 */
export async function confirm(message: string, options: {
    /**
     * By default, a GUI dialog is displayed in the browser, and text mode is
     * used in the terminal. Set this option to `true` will force the program
     * to always display a GUI dialog, even in the terminal.
     * 
     * When in the terminal, the GUI dialog is rendered with the OS's native
     * dialog. If the dialog is failed to display, an error will be thrown.
     * 
     * This option is only functional in `Windows`, `macOS` and `Linux`, it is
     * ignored in other platforms and the browser.
     */
    gui?: boolean;
} = {}): Promise<boolean> {
    if (isBrowserWindow) {
        return await confirmInBrowser(message);
    } else if (isDeno || isNodeLike) {
        return await confirmInTerminal(message, options);
    } else {
        throw new Error("Unsupported runtime");
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
export async function prompt(message: string, options?: {
    defaultValue?: string | undefined;
    type?: "text" | "password";
    /**
     * Terminal only, used when `type` is `password`. The default value is
     * `*`, use an empty string if you don't want to show any character.
     * 
     * This option is ignored when `gui` is `true`.
     */
    mask?: string;
    /**
     * By default, a GUI dialog is displayed in the browser, and text mode is
     * used in the terminal. Set this option to `true` will force the program
     * to always display a GUI dialog, even in the terminal.
     * 
     * When in the terminal, the GUI dialog is rendered with the OS's native
     * dialog. If the dialog is failed to display, an error will be thrown.
     * 
     * This option is only functional in `Windows`, `macOS` and `Linux`, it is
     * ignored in other platforms and the browser.
     * 
     * NOTE: currently, the Windows support of GUI dialog is very troublesome,
     * it doesn't support non-latin characters and has fussy font rendering.
     */
    gui?: boolean;
}): Promise<string | null>;
export async function prompt(message: string, options: string | {
    defaultValue?: string | undefined;
    type?: "text" | "password";
    mask?: string;
    gui?: boolean;
} = ""): Promise<string | null> {
    const defaultValue = typeof options === "string"
        ? options
        : options.defaultValue;
    const type = typeof options === "object"
        ? options.type ?? "text"
        : "text";
    const mask = type === "password"
        ? typeof options === "object" ? (options.mask ?? "*") : "*"
        : undefined;
    const gui = typeof options === "object" ? (options.gui ?? false) : false;

    if (isBrowserWindow) {
        return await promptInBrowser(message, { type, defaultValue });
    } else if (isDeno || isNodeLike) {
        return await promptInTerminal(message, { defaultValue, type, mask, gui });
    } else {
        throw new Error("Unsupported runtime");
    }
}
