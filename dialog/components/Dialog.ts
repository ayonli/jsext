export default function Dialog(props: {
    onPressEscape?: (event: Event) => void;
    onPressEnter?: (event: KeyboardEvent, dialog: HTMLDialogElement) => void;
}, ...children: HTMLElement[]) {
    const { onPressEscape, onPressEnter } = props;
    const hasInput = children.some(node => node.querySelector("input"));
    const dialog = document.createElement("dialog");

    dialog.style.fontFamily = "Inter,sans-serif";
    dialog.style.fontSize = "1rem";
    dialog.style.width = "416px";
    dialog.style.border = "1px solid #ccc";
    dialog.style.borderRadius = "13px";
    dialog.style.padding = "1rem";
    dialog.style.backgroundColor = "#fff";
    dialog.style.outline = "none";

    if (!hasInput) {
        dialog.inert = true;
    }

    if (onPressEscape) {
        dialog.addEventListener("cancel", (event) => {
            onPressEscape!(event);
            dialog.close();
            document.body.removeChild(dialog);
        });
    }

    if (onPressEnter) {
        dialog.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                onPressEnter!(event, dialog);
                dialog.close();
                document.body.removeChild(dialog);
            }
        });
    }

    children.forEach(child => {
        dialog.appendChild(child);
    });

    requestAnimationFrame(() => {
        dialog.showModal();

        if (!hasInput) {
            dialog.inert = false;

            requestAnimationFrame(() => {
                dialog.focus();
            });
        }
    });

    return dialog;
}
