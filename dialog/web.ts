/**
 * The implementation of `dialog` module for the browser.
 * 
 * Normally, we should just use the `dialog` module, however, if we don't want
 * to include other parts that are not needed in the browser, we can use this
 * module instead.
 * @module
 */

import { isValid } from "@jsext/object";
import CancelButton, { getCancelText } from "./web/CancelButton.ts";
import Dialog, { closeDialog } from "./web/Dialog.ts";
import Footer from "./web/Footer.ts";
import Input from "./web/Input.ts";
import OkButton, { getOkText } from "./web/OkButton.ts";
import Progress from "./web/Progress.ts";
import Text from "./web/Text.ts";
import type { ProgressAbortHandler, ProgressFunc, ProgressState } from "./progress.ts";
import type { DialogOptions, PromptOptions } from "./index.ts";

export * from "./web/file.ts";

export async function alert(message: string, options: DialogOptions = {}): Promise<void> {
    await new Promise<void>(_resolve => {
        const resolve = () => {
            timer && clearTimeout(timer);
            _resolve();
        };
        const button = OkButton();
        const dialog = Dialog(
            {
                onCancel: () => resolve(),
                onOk: () => resolve(),
            },
            Text(message),
            Footer(
                button
            )
        );

        let remains = options?.timeout ? Math.max(1, Math.round(options.timeout / 1_000)) : 0;
        const timer = remains
            ? setInterval(() => {
                button.textContent = `${getOkText()} (${--remains})`;
                if (remains === 0) {
                    closeDialog(dialog, "OK");
                }
            }, 1_000)
            : undefined;

        if (remains) {
            button.textContent = `${getOkText()} (${remains})`;
        }

        document.body.appendChild(dialog);
    });
}

export async function confirm(message: string, options: DialogOptions = {}): Promise<boolean> {
    return new Promise<boolean>(_resolve => {
        const resolve = (value: boolean) => {
            timer && clearInterval(timer);
            _resolve(value);
        };
        const cancelButton = CancelButton();
        const dialog = Dialog(
            {
                onCancel: () => resolve(false),
                onOk: () => resolve(true),
            },
            Text(message),
            Footer(
                cancelButton,
                OkButton()
            )
        );

        let remains = options?.timeout ? Math.max(1, Math.round(options.timeout / 1_000)) : 0;
        const timer = remains
            ? setInterval(() => {
                cancelButton.textContent = `${getCancelText()} (${--remains})`;
                if (remains === 0) {
                    closeDialog(dialog, "Cancel");
                }
            }, 1_000)
            : undefined;

        if (remains) {
            cancelButton.textContent = `${getCancelText()} (${remains})`;
        }

        document.body.appendChild(dialog);
    });
}

export async function prompt(message: string, options: PromptOptions = {}): Promise<string | null> {
    const { type, defaultValue } = options;
    return new Promise<string | null>(_resolve => {
        const inputDiv = Input({ type, value: defaultValue });
        const cancelButton = CancelButton();
        const okButton = OkButton();
        const dialog = Dialog(
            {
                onCancel: () => resolve(null),
                onOk: (dialog: HTMLDialogElement) => {
                    const input = dialog.querySelector("input") as HTMLInputElement;
                    resolve(input.value);
                },
            },
            Text(message),
            inputDiv,
            Footer(
                cancelButton,
                okButton
            )
        );

        const hasDefaultValue = isValid(defaultValue); // in case of `null`
        let remains = options?.timeout ? Math.max(1, Math.round(options.timeout / 1_000)) : 0;
        let timer = remains
            ? setInterval(() => {
                if (hasDefaultValue) {
                    okButton.textContent = `${getOkText()} (${--remains})`;
                    if (remains === 0) {
                        closeDialog(dialog, "OK");
                    }
                } else {
                    cancelButton.textContent = `${getCancelText()} (${--remains})`;
                    if (remains === 0) {
                        closeDialog(dialog, "Cancel");
                    }
                }
            }, 1_000)
            : undefined;
        const resolve = (value: string | null) => {
            timer && clearInterval(timer);
            _resolve(value);
        };

        if (timer) {
            const input = inputDiv.querySelector("input");
            input?.addEventListener("input", () => {
                clearInterval(timer);
                timer = undefined;

                if (hasDefaultValue) {
                    okButton.textContent = getOkText();
                } else {
                    cancelButton.textContent = getCancelText();
                }
            });
        }

        if (remains) {
            if (hasDefaultValue) {
                okButton.textContent = `${getOkText()} (${remains})`;
            } else {
                cancelButton.textContent = `${getCancelText()} (${remains})`;
            }
        }

        document.body.appendChild(dialog);
    });
}

export async function progress<T>(
    message: string,
    fn: ProgressFunc<T>,
    onAbort: ProgressAbortHandler<T> | undefined = undefined
): Promise<T | null> {
    const ctrl = new AbortController();
    const signal = ctrl.signal;
    let fallback: { value: T; } | null = null;
    const abort = !onAbort ? undefined : async () => {
        try {
            const result = await onAbort();
            fallback = { value: result };
            ctrl.abort();
        } catch (err) {
            ctrl.abort(err);
        }
    };
    const listenForAbort = !onAbort ? undefined : () => new Promise<T>((resolve, reject) => {
        signal.addEventListener("abort", () => {
            if (fallback) {
                resolve(fallback.value);
            } else {
                reject(signal.reason);
            }
        });
    });
    const text = Text(message);
    const { element: progressBar, setValue } = Progress();
    const dialog = Dialog({ onCancel: abort }, text);

    const set = (state: ProgressState) => {
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
        dialog.appendChild(
            Footer(
                progressBar,
                CancelButton()
            )
        );
    } else {
        dialog.appendChild(progressBar);
    }

    document.body.appendChild(dialog);
    let job = fn(set, signal);

    if (listenForAbort) {
        job = Promise.race([job, listenForAbort()]);
    }

    try {
        return await job;
    } finally {
        signal.aborted || closeDialog(dialog, "OK");
    }
}
