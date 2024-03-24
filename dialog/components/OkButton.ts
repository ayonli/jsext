import { closeDialog } from "./Dialog.ts";

export default function OkButton(props: {
    onClick: (event: MouseEvent, dialog: HTMLDialogElement) => void;
}, text: string) {
    const button = document.createElement("button");

    button.textContent = text;
    button.style.width = "5rem";
    button.style.height = "2rem";
    button.style.borderStyle = "none";
    button.style.borderRadius = "1.5rem";
    button.style.color = "#fff";
    button.style.backgroundColor = "#006bd6";
    button.style.userSelect = "none";
    button.style.fontWeight = "500";

    button.addEventListener("mouseover", () => {
        button.style.backgroundColor = "#1677d8";
    });

    button.addEventListener("mouseout", () => {
        button.style.backgroundColor = "#006bd6";
    });

    button.addEventListener("click", (event) => {
        const dialog = (event.target as HTMLButtonElement)?.closest("dialog")!;
        closeDialog(dialog);
        props.onClick(event, dialog);
    });

    return button;
}
