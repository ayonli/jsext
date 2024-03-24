import { closeDialog } from "./Dialog.ts";

export default function CancelButton(props: {
    onClick: (event: MouseEvent, dialog: HTMLDialogElement) => void;
}, text: string) {
    const button = document.createElement("button");

    button.textContent = text;
    button.style.width = "5rem";
    button.style.height = "2rem";
    button.style.border = "1px solid #8ebceb";
    button.style.borderRadius = "1.5rem";
    button.style.color = "#006bd6";
    button.style.backgroundColor = "#fff";
    button.style.userSelect = "none";
    button.style.fontSize = "1em";
    button.style.fontWeight = "500";

    button.addEventListener("mouseover", () => {
        button.style.backgroundColor = "#f0f0f0";
    });

    button.addEventListener("mouseout", () => {
        button.style.backgroundColor = "#fff";
    });

    button.addEventListener("click", (event) => {
        const dialog = (event.target as HTMLButtonElement)?.closest("dialog")!;
        closeDialog(dialog);
        props.onClick(event, dialog);
    });

    return button;
}
