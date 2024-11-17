import CancelButton from './web/CancelButton.js';
import Dialog, { closeDialog } from './web/Dialog.js';
import Footer from './web/Footer.js';
import Input from './web/Input.js';
import OkButton from './web/OkButton.js';
import Progress from './web/Progress.js';
import Text from './web/Text.js';
export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile } from './web/file.js';

/**
 * The implementation of `dialog` module for the browser.
 *
 * Normally, we should just use the `dialog` module, however, if we don't want
 * to include other parts that are not needed in the browser, we can use this
 * module instead.
 * @module
 */
async function alert(message) {
    await new Promise(resolve => {
        document.body.appendChild(Dialog({
            onCancel: () => resolve(),
            onOk: () => resolve(),
        }, Text(message), Footer(OkButton())));
    });
}
async function confirm(message) {
    return new Promise(resolve => {
        document.body.appendChild(Dialog({
            onCancel: () => resolve(false),
            onOk: () => resolve(true),
        }, Text(message), Footer(CancelButton(), OkButton())));
    });
}
async function prompt(message, options = {}) {
    const { type, defaultValue } = options;
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
async function progress(message, fn, onAbort = undefined) {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let fallback = null;
    const abort = !onAbort ? undefined : async () => {
        try {
            const result = await onAbort();
            fallback = { value: result };
            ctrl.abort();
        }
        catch (err) {
            ctrl.abort(err);
        }
    };
    const listenForAbort = !onAbort ? undefined : () => new Promise((resolve, reject) => {
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
    if (abort) {
        dialog.appendChild(Footer(progressBar, CancelButton()));
    }
    else {
        dialog.appendChild(progressBar);
    }
    document.body.appendChild(dialog);
    let job = fn(set, signal);
    if (listenForAbort) {
        job = Promise.race([job, listenForAbort()]);
    }
    try {
        return await job;
    }
    finally {
        signal.aborted || closeDialog(dialog, "OK");
    }
}

export { alert, confirm, progress, prompt };
//# sourceMappingURL=web.js.map
