import { isBrowserWindow, isDeno, isNodeLike } from './env.js';
export { default as progress } from './dialog/progress.js';
export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile } from './dialog/file.js';

/**
 * Asynchronous dialog functions for both browsers and terminals.
 *
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 * @experimental
 * @module
 */
/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 *
 * @example
 * ```ts
 * import { alert } from "@ayonli/jsext/dialog";
 *
 * await alert("Hello, world!");
 * ```
 */
async function alert(message, options = {}) {
    if (isBrowserWindow) {
        const { alert } = await import('./dialog/web.js');
        await alert(message);
    }
    else if (isDeno || isNodeLike) {
        const { default: alert } = await import('./dialog/cli/alert.js');
        await alert(message, options);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 *
 * @example
 * ```ts
 * import { confirm } from "@ayonli/jsext/dialog";
 *
 * if (await confirm("Are you sure?")) {
 *     console.log("Confirmed");
 * } else {
 *     console.log("Canceled");
 * }
 * ```
 */
async function confirm(message, options = {}) {
    if (isBrowserWindow) {
        const { confirm } = await import('./dialog/web.js');
        return await confirm(message);
    }
    else if (isDeno || isNodeLike) {
        const { default: confirm } = await import('./dialog/cli/confirm.js');
        return await confirm(message, options);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
async function prompt(message, options = "") {
    var _a, _b, _c;
    const defaultValue = typeof options === "string"
        ? options
        : options.defaultValue;
    const type = typeof options === "object"
        ? (_a = options.type) !== null && _a !== void 0 ? _a : "text"
        : "text";
    const mask = type === "password"
        ? typeof options === "object" ? ((_b = options.mask) !== null && _b !== void 0 ? _b : "*") : "*"
        : undefined;
    const gui = typeof options === "object" ? ((_c = options.gui) !== null && _c !== void 0 ? _c : false) : false;
    if (isBrowserWindow) {
        const { prompt } = await import('./dialog/web.js');
        return await prompt(message, { type, defaultValue });
    }
    else if (isDeno || isNodeLike) {
        const { default: prompt } = await import('./dialog/cli/prompt.js');
        return await prompt(message, { defaultValue, type, mask, gui });
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { alert, confirm, prompt };
//# sourceMappingURL=dialog.js.map
