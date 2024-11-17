/**
 * The implementation of `dialog` module for the browser.
 * 
 * Normally, we should just use the `dialog` module, however, if we don't want
 * to include other parts that are not needed in the browser, we can use this
 * module instead.
 * @module
 */
import CancelButton from "./CancelButton.ts";
import Dialog, { closeDialog } from "./Dialog.ts";
import Footer from "./Footer.ts";
import Input from "./Input.ts";
import OkButton from "./OkButton.ts";
import Progress from "./Progress.ts";
import Text from "./Text.ts";
import type { PromptOptions } from "../../dialog.ts";
import type { ProgressAbortHandler, ProgressFunc, ProgressState } from "../progress.ts";

export * from "./file.ts";

export async function alert(message: string) {
    await new Promise<void>(resolve => {
        document.body.appendChild(
            Dialog(
                {
                    onCancel: () => resolve(),
                    onOk: () => resolve(),
                },
                Text(message),
                Footer(
                    OkButton()
                )
            )
        );
    });
}

export async function confirm(message: string) {
    return new Promise<boolean>(resolve => {
        document.body.appendChild(
            Dialog(
                {
                    onCancel: () => resolve(false),
                    onOk: () => resolve(true),
                },
                Text(message),
                Footer(
                    CancelButton(),
                    OkButton()
                )
            )
        );
    });
}

export async function prompt(message: string, options: PromptOptions = {}) {
    const { type, defaultValue } = options;
    return new Promise<string | null>(resolve => {
        document.body.appendChild(
            Dialog(
                {
                    onCancel: () => resolve(null),
                    onOk: (dialog: HTMLDialogElement) => {
                        const input = dialog.querySelector("input") as HTMLInputElement;
                        resolve(input.value);
                    },
                },
                Text(message),
                Input({ type, value: defaultValue }),
                Footer(
                    CancelButton(),
                    OkButton()
                )
            )
        );
    });
}

export async function progress<T>(
    message: string,
    fn: ProgressFunc<T>,
    onAbort: ProgressAbortHandler<T> | undefined = undefined
) {
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
