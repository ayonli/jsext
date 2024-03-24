function Dialog(props, ...children) {
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
            onPressEscape(event);
            closeDialog(dialog);
        });
    }
    if (onPressEnter) {
        dialog.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                onPressEnter(event, dialog);
                closeDialog(dialog);
            }
        });
    }
    children.forEach(child => {
        dialog.appendChild(child);
    });
    requestAnimationFrame(() => {
        if (typeof dialog.showModal === "function") {
            dialog.showModal();
        }
        else if (typeof dialog.show === "function") {
            dialog.show();
        }
        else {
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
function closeDialog(dialog) {
    if (typeof dialog.close === "function") {
        dialog.close();
    }
    else {
        dialog.open = false; // for testing with JSDOM
    }
    try {
        document.body.removeChild(dialog);
    }
    catch (err) {
        if (err["name"] !== "NotFoundError") { // Ignore NotFoundError (in Safari)
            throw err;
        }
    }
}

export { closeDialog, Dialog as default };
//# sourceMappingURL=Dialog.js.map
