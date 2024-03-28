import Dialog from './components/Dialog.js';
import Text from './components/Text.js';
import Footer from './components/Footer.js';
import OkButton from './components/OkButton.js';
import CancelButton from './components/CancelButton.js';
import Input from './components/Input.js';
export { default as progress } from './progress.js';
import { isDenoRepl, questionInDeno, isNodeRepl, questionInNodeRepl, listenForCancel } from './util.js';

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
 *
 * **NOTE**: Despite defined as an async function, in Deno REPL, this function
 * actually calls the global `alert` function directly, which is synchronous.
 */
async function alert(message) {
    if (typeof Deno === "object") {
        if (isDenoRepl()) {
            return Promise.resolve(globalThis.alert(message));
        }
        else {
            await questionInDeno(message + " [Enter] ");
            return;
        }
    }
    else if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(),
                onOk: () => resolve(),
            }, Text(message), Footer(OkButton())));
        });
    }
    else if (await isNodeRepl()) {
        await questionInNodeRepl(message + " [Enter] ");
        return;
    }
    else {
        const { createInterface } = await import('readline/promises');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const { signal, promise, cleanup } = listenForCancel();
        await Promise.race([
            rl.question(message + " [Enter] ", { signal }),
            promise
        ]);
        cleanup();
        rl.close();
    }
}
/**
 * Displays a dialog with a message, and to wait until the user either confirms
 * or cancels the dialog.
 *
 * **NOTE**: Despite defined as an async function, in Deno REPL, this function
 * actually calls the global `confirm` function directly, which is synchronous.
 */
async function confirm(message) {
    if (typeof Deno === "object") {
        if (isDenoRepl()) {
            return Promise.resolve(globalThis.confirm(message));
        }
        else {
            const answer = await questionInDeno(message + " [y/N] ");
            const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
            return ok === "y" || ok === "yes";
        }
    }
    else if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(false),
                onOk: () => resolve(true),
            }, Text(message), Footer(CancelButton(), OkButton())));
        });
    }
    else if (await isNodeRepl()) {
        const answer = await questionInNodeRepl(message + " [y/N] ");
        const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
        return ok === "y" || ok === "yes";
    }
    else {
        const { createInterface } = await import('readline/promises');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const { signal, promise, cleanup } = listenForCancel();
        const answer = await Promise.race([
            rl.question(message + " [y/N] ", { signal }),
            promise,
        ]);
        const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
        cleanup();
        rl.close();
        return ok === "y" || ok === "yes";
    }
}
/**
 * Displays a dialog with a message prompting the user to input some text, and to
 * wait until the user either submits the text or cancels the dialog.
 *
 * **NOTE**: Despite defined as an async function, in Deno REPL, this function
 * actually calls the global `prompt` function directly, which is synchronous.
 */
async function prompt(message, defaultValue = "") {
    if (typeof Deno === "object") {
        if (isDenoRepl()) {
            return Promise.resolve(globalThis.prompt(message, defaultValue));
        }
        else {
            return await questionInDeno(message + " ", defaultValue);
        }
    }
    else if (typeof document === "object") {
        return new Promise(resolve => {
            document.body.appendChild(Dialog({
                onCancel: () => resolve(null),
                onOk: (dialog) => {
                    const input = dialog.querySelector("input");
                    resolve(input.value);
                },
            }, Text(message), Input(defaultValue), Footer(CancelButton(), OkButton())));
        });
    }
    else if (await isNodeRepl()) {
        return await questionInNodeRepl(message + " ", defaultValue);
    }
    else {
        const { createInterface } = await import('readline/promises');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const { signal, promise, cleanup } = listenForCancel();
        const job = rl.question(message + " ", { signal });
        if (defaultValue) {
            rl.write(defaultValue);
        }
        const answer = await Promise.race([job, promise]);
        cleanup();
        rl.close();
        return answer;
    }
}

export { alert, confirm, prompt };
//# sourceMappingURL=index.js.map
