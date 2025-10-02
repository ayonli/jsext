import CancelButton, { getCancelText } from './web/CancelButton.js';
import Dialog, { closeDialog } from './web/Dialog.js';
import Footer from './web/Footer.js';
import Input from './web/Input.js';
import OkButton, { getOkText } from './web/OkButton.js';
import Progress from './web/Progress.js';
import Text from './web/Text.js';
import { isValid } from '../object.js';
export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile } from './web/file.js';

/**
 * The implementation of `dialog` module for the browser.
 *
 * Normally, we should just use the `dialog` module, however, if we don't want
 * to include other parts that are not needed in the browser, we can use this
 * module instead.
 * @module
 */
async function alert(message, options = {}) {
    await new Promise(_resolve => {
        const resolve = () => {
            timer && clearTimeout(timer);
            _resolve();
        };
        const button = OkButton();
        const dialog = Dialog({
            onCancel: () => resolve(),
            onOk: () => resolve(),
        }, Text(message), Footer(button));
        let remains = (options === null || options === void 0 ? void 0 : options.timeout) ? Math.max(1, Math.round(options.timeout / 1000)) : 0;
        const timer = remains
            ? setInterval(() => {
                button.textContent = `${getOkText()} (${--remains})`;
                if (remains === 0) {
                    closeDialog(dialog, "OK");
                }
            }, 1000)
            : undefined;
        if (remains) {
            button.textContent = `${getOkText()} (${remains})`;
        }
        document.body.appendChild(dialog);
    });
}
async function confirm(message, options = {}) {
    return new Promise(_resolve => {
        const resolve = (value) => {
            timer && clearInterval(timer);
            _resolve(value);
        };
        const cancelButton = CancelButton();
        const dialog = Dialog({
            onCancel: () => resolve(false),
            onOk: () => resolve(true),
        }, Text(message), Footer(cancelButton, OkButton()));
        let remains = (options === null || options === void 0 ? void 0 : options.timeout) ? Math.max(1, Math.round(options.timeout / 1000)) : 0;
        const timer = remains
            ? setInterval(() => {
                cancelButton.textContent = `${getCancelText()} (${--remains})`;
                if (remains === 0) {
                    closeDialog(dialog, "Cancel");
                }
            }, 1000)
            : undefined;
        if (remains) {
            cancelButton.textContent = `${getCancelText()} (${remains})`;
        }
        document.body.appendChild(dialog);
    });
}
async function prompt(message, options = {}) {
    const { type, defaultValue } = options;
    return new Promise(_resolve => {
        const inputDiv = Input({ type, value: defaultValue });
        const cancelButton = CancelButton();
        const okButton = OkButton();
        const dialog = Dialog({
            onCancel: () => resolve(null),
            onOk: (dialog) => {
                const input = dialog.querySelector("input");
                resolve(input.value);
            },
        }, Text(message), inputDiv, Footer(cancelButton, okButton));
        const hasDefaultValue = isValid(defaultValue); // in case of `null`
        let remains = (options === null || options === void 0 ? void 0 : options.timeout) ? Math.max(1, Math.round(options.timeout / 1000)) : 0;
        let timer = remains
            ? setInterval(() => {
                if (hasDefaultValue) {
                    okButton.textContent = `${getOkText()} (${--remains})`;
                    if (remains === 0) {
                        closeDialog(dialog, "OK");
                    }
                }
                else {
                    cancelButton.textContent = `${getCancelText()} (${--remains})`;
                    if (remains === 0) {
                        closeDialog(dialog, "Cancel");
                    }
                }
            }, 1000)
            : undefined;
        const resolve = (value) => {
            timer && clearInterval(timer);
            _resolve(value);
        };
        if (timer) {
            const input = inputDiv.querySelector("input");
            input === null || input === void 0 ? void 0 : input.addEventListener("input", () => {
                clearInterval(timer);
                timer = undefined;
                if (hasDefaultValue) {
                    okButton.textContent = getOkText();
                }
                else {
                    cancelButton.textContent = getCancelText();
                }
            });
        }
        if (remains) {
            if (hasDefaultValue) {
                okButton.textContent = `${getOkText()} (${remains})`;
            }
            else {
                cancelButton.textContent = `${getCancelText()} (${remains})`;
            }
        }
        document.body.appendChild(dialog);
    });
}
async function progress(message, fn, onAbort = undefined) {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let fallback = null;
    const abort = async () => {
        try {
            if (onAbort) {
                const result = await onAbort();
                if (result !== null && result !== undefined) {
                    fallback = { value: result };
                }
                else {
                    fallback = { value: null };
                }
            }
            else {
                fallback = { value: null };
            }
            ctrl.abort();
        }
        catch (err) {
            ctrl.abort(err);
        }
    };
    const listenForAbort = () => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
            if (fallback) {
                resolve(fallback.value);
            }
            else {
                reject(signal.reason);
            }
        });
    });
    const text = Text(message);
    const { element: progressBar, setValue } = Progress();
    const dialog = Dialog({ onCancel: abort }, text);
    const set = (state) => {
        if (signal.aborted) {
            return;
        }
        if (state.message) {
            text.innerHTML = state.message.replace(/ /g, "&nbsp;").replace(/\n/g, "<br />");
        }
        if (state.percent !== undefined) {
            setValue(state.percent);
        }
    };
    dialog.appendChild(Footer(progressBar, CancelButton()));
    document.body.appendChild(dialog);
    const job = Promise.race([fn(set, signal), listenForAbort()]);
    try {
        return await job;
    }
    finally {
        signal.aborted || closeDialog(dialog, "OK");
    }
}

export { alert, confirm, progress, prompt };
//# sourceMappingURL=web.js.map
