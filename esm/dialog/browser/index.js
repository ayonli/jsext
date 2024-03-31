import CancelButton from './CancelButton.js';
import Dialog from './Dialog.js';
import Footer from './Footer.js';
import Input from './Input.js';
import OkButton from './OkButton.js';
import Text from './Text.js';

async function alertInBrowser(message) {
    await new Promise(resolve => {
        document.body.appendChild(Dialog({
            onCancel: () => resolve(),
            onOk: () => resolve(),
        }, Text(message), Footer(OkButton())));
    });
}
async function confirmInBrowser(message) {
    return new Promise(resolve => {
        document.body.appendChild(Dialog({
            onCancel: () => resolve(false),
            onOk: () => resolve(true),
        }, Text(message), Footer(CancelButton(), OkButton())));
    });
}
async function promptInBrowser(message, options) {
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

export { alertInBrowser, confirmInBrowser, promptInBrowser };
//# sourceMappingURL=index.js.map
