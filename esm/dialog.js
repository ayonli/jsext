export { default as progress } from './dialog/progress.js';
export { default as pickFile } from './dialog/pickFile.js';
import { alertInBrowser, confirmInBrowser, promptInBrowser } from './dialog/browser/index.js';
import alertInTerminal from './dialog/terminal/alert.js';
import confirmInTerminal from './dialog/terminal/confirm.js';
import promptInTerminal from './dialog/terminal/prompt.js';

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
 */
async function alert(message, options = {}) {
    if (typeof document === "object") {
        await alertInBrowser(message);
    }
    else {
        await alertInTerminal(message, options);
    }
}
/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 */
async function confirm(message, options = {}) {
    if (typeof document === "object") {
        return await confirmInBrowser(message);
    }
    else {
        return await confirmInTerminal(message, options);
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
    const preferGUI = typeof options === "object" ? ((_c = options.preferGUI) !== null && _c !== void 0 ? _c : false) : false;
    if (typeof document === "object") {
        return await promptInBrowser(message, { type, defaultValue });
    }
    else {
        return await promptInTerminal(message, { defaultValue, type, mask, preferGUI });
    }
}

export { alert, confirm, prompt };
//# sourceMappingURL=dialog.js.map