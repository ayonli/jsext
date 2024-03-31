import CancelButton from "./CancelButton.ts";
import Dialog from "./Dialog.ts";
import Footer from "./Footer.ts";
import Input from "./Input.ts";
import OkButton from "./OkButton.ts";
import Text from "./Text.ts";

export async function alertInBrowser(message: string) {
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

export async function confirmInBrowser(message: string) {
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

export async function promptInBrowser(message: string, options: {
    type: "text" | "password";
    defaultValue?: string | undefined;
}) {
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
