export { default as progress } from './dialog/progress.js';
export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile } from './dialog/file.js';
import { alertInBrowser, confirmInBrowser, promptInBrowser } from './dialog/browser/index.js';
import alertInTerminal from './dialog/terminal/alert.js';
import confirmInTerminal from './dialog/terminal/confirm.js';
import promptInTerminal from './dialog/terminal/prompt.js';
import { isBrowserWindow, isDeno, isNodeLike } from './env.js';

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
        await alertInBrowser(message);
    }
    else if (isDeno || isNodeLike) {
        await alertInTerminal(message, options);
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
        return await confirmInBrowser(message);
    }
    else if (isDeno || isNodeLike) {
        return await confirmInTerminal(message, options);
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
        return await promptInBrowser(message, { type, defaultValue });
    }
    else if (isDeno || isNodeLike) {
        return await promptInTerminal(message, { defaultValue, type, mask, gui });
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { alert, confirm, prompt };
//# sourceMappingURL=dialog.js.map
