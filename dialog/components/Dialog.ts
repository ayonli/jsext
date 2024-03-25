const CloseEventListeners = new WeakMap<HTMLDialogElement, () => void>();

export default function Dialog(props: {
    onCancel?: (dialog: HTMLDialogElement) => void;
    onOk?: (dialog: HTMLDialogElement) => void;
}, ...children: HTMLElement[]) {
    const { onCancel, onOk } = props;
    const hasInput = children.some(node => node.querySelector("input"));
    const dialog = document.createElement("dialog");

    dialog.style.fontFamily = "Inter,sans-serif";
    dialog.style.fontSize = "13px";
    dialog.style.width = "416px";
    dialog.style.border = "1px solid #ccc";
    dialog.style.borderRadius = "13px";
    dialog.style.padding = "1rem";
    dialog.style.backgroundColor = "#fff";
    dialog.style.outline = "none";

    if (!hasInput) {
        dialog.inert = true;
    }

    const close = () => {
        if (!dialog.returnValue || dialog.returnValue === "Cancel") {
            onCancel?.(dialog);
        } else if (dialog.returnValue === "OK") {
            onOk?.(dialog);
        }

        try {
            document.body.removeChild(dialog);
        } catch (err: any) {
            if (err["name"] !== "NotFoundError") { // Ignore NotFoundError (in Safari)
                throw err;
            }
        }
    };

    if (typeof dialog.close === "function") {
        dialog.addEventListener("close", close);
    } else { // jsdom
        CloseEventListeners.set(dialog, close);
    }

    dialog.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            closeDialog(dialog, "OK");
        }
    });

    children.forEach(child => {
        dialog.appendChild(child);
    });

    requestAnimationFrame(() => {
        if (typeof dialog.showModal === "function") {
            dialog.showModal();
        } else if (typeof dialog.show === "function") {
            dialog.show();
        } else {
            dialog.open = true; // for testing with JSDOM
        }

        if (!hasInput) {
            dialog.inert = false;

            requestAnimationFrame(() => {
                dialog.focus();
            });
        }
    });

    return dialog;
}

export function closeDialog(dialog: HTMLDialogElement, returnValue: "OK" | "Cancel") {
    if (typeof dialog.close === "function") {
        dialog.close(returnValue);
    } else { // for testing with JSDOM
        dialog.open = false;
        dialog.returnValue = returnValue;

        try {
            dialog.dispatchEvent(new Event("close"));
        } catch {
            const close = CloseEventListeners.get(dialog);

            if (close) {
                close();
                CloseEventListeners.delete(dialog);
            }
        }
    }
}
