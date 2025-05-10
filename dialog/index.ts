/**
 * Asynchronous dialog functions for both browsers and terminals.
 * 
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 * @experimental
 * @module
 */
import { isBrowserWindow, isDeno, isNodeLike } from "@jsext/env";
import { throwUnsupportedRuntimeError } from "@jsext/error";
import progress from "./progress.ts";

export { progress };
export * from "./progress.ts";
export * from "./file.ts";

/**
 * Options for dialog functions such as {@link alert}, {@link confirm} and
 * {@link prompt}.
 */
export interface DialogOptions {
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
    /**
     * The time in milliseconds to wait before the dialog is automatically
     * dismissed. Should set to a positive number greater than `1000` and be a
     * multiple of `1000` as the dialog will display the remaining time in
     * seconds.
     * 
     * This option is only available in the browser.
     */
    timeout?: number | undefined;
}

/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 * 
 * @example
 * ```ts
 * import { alert } from "@jsext/dialog";
 * 
 * await alert("Hello, world!");
 * ```
 */
export async function alert(message: string, options: DialogOptions = {}): Promise<void> {
    if (isBrowserWindow) {
        const { alert } = await import("./web.ts");
        await alert(message, options);
    } else if (isDeno || isNodeLike) {
        const { default: alert } = await import("./cli/alert.ts");
        await alert(message, options);
    } else {
        throwUnsupportedRuntimeError();
    }
}

/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 * 
 * @example
 * ```ts
 * import { confirm } from "@jsext/dialog";
 * 
 * if (await confirm("Are you sure?")) {
 *     console.log("Confirmed");
 * } else {
 *     console.log("Canceled");
 * }
 * ```
 */
export async function confirm(message: string, options: DialogOptions = {}): Promise<boolean> {
    if (isBrowserWindow) {
        const { confirm } = await import("./web.ts");
        return await confirm(message, options);
    } else if (isDeno || isNodeLike) {
        const { default: confirm } = await import("./cli/confirm.ts");
        return await confirm(message, options);
    } else {
        throwUnsupportedRuntimeError();
    }
}

/**
 * Options for the {@link prompt} function.
 */
export interface PromptOptions extends DialogOptions {
    /**
     * The default value of the input box.
     */
    defaultValue?: string | undefined;
    /**
     * The type of the input box. The default value is `text`, when `password`
     * is specified, the input will be masked.
     */
    type?: "text" | "password";
    /**
     * Terminal only, used when `type` is `password`. The default value is
     * `*`, use an empty string if you don't want to show any character.
     * 
     * This option is ignored when `gui` is `true`.
     */
    mask?: string | undefined;
}

/**
 * Displays a dialog with a message prompting the user to input some text, and to
 * wait until the user either submits the text or cancels the dialog.
 * 
 * @example
 * ```ts
 * import { prompt } from "@jsext/dialog";
 * 
 * const name = await prompt("What's your name?");
 * 
 * if (name) {
 *     console.log(`Hello, ${name}!`);
 * }
 * ```
 * 
 * @example
 * ```ts
 * // with default value
 * import { prompt } from "@jsext/dialog";
 * 
 * const name = await prompt("What's your name?", "John Doe");
 * 
 * if (name) {
 *     console.log(`Hello, ${name}!`);
 * }
 * ```
 */
export async function prompt(
    message: string,
    defaultValue?: string | undefined
): Promise<string | null>;
/**
 * @example
 * ```ts
 * // input password
 * import { prompt } from "@jsext/dialog";
 * 
 * const password = await prompt("Enter your password:", { type: "password" });
 * 
 * if (password) {
 *     console.log("Your password is:", password);
 * }
 * ```
 */
export async function prompt(message: string, options?: PromptOptions): Promise<string | null>;
export async function prompt(
    message: string,
    options: string | PromptOptions = ""
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
    const gui = typeof options === "object" ? (options.gui ?? false) : false;
    const timeout = typeof options === "object" ? options.timeout : undefined;

    if (isBrowserWindow) {
        const { prompt } = await import("./web.ts");
        return await prompt(message, { defaultValue, type, timeout });
    } else if (isDeno || isNodeLike) {
        const { default: prompt } = await import("./cli/prompt.ts");
        return await prompt(message, { defaultValue, type, mask, gui, timeout });
    } else {
        throwUnsupportedRuntimeError();
    }
}
