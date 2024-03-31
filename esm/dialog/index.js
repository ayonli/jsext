import Dialog from './components/Dialog.js';
import Text from './components/Text.js';
import Footer from './components/Footer.js';
import OkButton from './components/OkButton.js';
import CancelButton from './components/CancelButton.js';
import Input from './components/Input.js';
export { default as progress } from './progress.js';
import { isNodeRepl } from './terminal/util.js';
import { questionInDeno, questionInNodeRepl, questionInNode } from './terminal/index.js';

/**
 * Asynchronous dialog functions for both browsers and Node.js.
 *
 * This includes `alert`, `confirm`, `prompt` and other non-standard dialogs.
 * @experimental
 * @module
 */
/**
 * Displays a dialog with a message, and to wait until the user dismisses the
 * dialog.
 */
async function alert(message) {
    if (typeof document === "object") {
        await new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(),
                onOk: () => resolve(),
            }, Text(message), Footer(OkButton())));
        });
    }
    else if (typeof Deno === "object") {
        await questionInDeno(message + " [Enter] ");
    }
    else if (await isNodeRepl()) {
        await questionInNodeRepl(message + " [Enter] ");
    }
    else {
        await questionInNodeRepl(message + " [Enter] ");
    }
}
/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 */
async function confirm(message) {
    if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(false),
                onOk: () => resolve(true),
            }, Text(message), Footer(CancelButton(), OkButton())));
        });
    }
    else {
        let answer;
        if (typeof Deno === "object") {
            answer = await questionInDeno(message + " [y/N] ");
        }
        else if (await isNodeRepl()) {
            answer = await questionInNodeRepl(message + " [y/N] ");
        }
        else {
            answer = await questionInNode(message + " [y/N] ");
        }
        const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    }
}
async function prompt(message, options = "") {
    var _a, _b;
    const defaultValue = typeof options === "string"
        ? options
        : options.defaultValue;
    const type = typeof options === "object"
        ? (_a = options.type) !== null && _a !== void 0 ? _a : "text"
        : "text";
    const mask = type === "password"
        ? typeof options === "object" ? ((_b = options.mask) !== null && _b !== void 0 ? _b : "*") : "*"
        : undefined;
    if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(null),
                onOk: (dialog) => {
                    const input = dialog.querySelector("input");
                    resolve(input.value);
                },
            }, Text(message), Input({ type, value: defaultValue }), Footer(CancelButton(), OkButton())));
        });
    }
    else if (typeof Deno === "object") {
        return await questionInDeno(message + " ", { defaultValue, mask });
    }
    else if (await isNodeRepl()) {
        return await questionInNodeRepl(message + " ", { defaultValue, mask });
    }
    else {
        return await questionInNode(message + " ", { defaultValue, mask });
    }
}

export { alert, confirm, prompt };
//# sourceMappingURL=index.js.map
