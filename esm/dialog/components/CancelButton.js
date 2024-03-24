import { closeDialog } from './Dialog.js';

function CancelButton(props, text) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.width = "5rem";
    button.style.height = "2rem";
    button.style.border = "1px solid #8ebceb";
    button.style.borderRadius = "1.5rem";
    button.style.color = "#006bd6";
    button.style.backgroundColor = "#fff";
    button.style.userSelect = "none";
    button.style.fontWeight = "500";
    button.addEventListener("mouseover", () => {
        button.style.backgroundColor = "#f0f0f0";
    });
    button.addEventListener("mouseout", () => {
        button.style.backgroundColor = "#fff";
    });
    button.addEventListener("click", (event) => {
        var _a;
        const dialog = (_a = event.target) === null || _a === void 0 ? void 0 : _a.closest("dialog");
        closeDialog(dialog);
        props.onClick(event, dialog);
    });
    return button;
}

export { CancelButton as default };
//# sourceMappingURL=CancelButton.js.map
