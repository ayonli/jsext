export default function Text(message: string) {
    const text = document.createElement("p");
    text.textContent = message;
    text.style.marginBlockStart = "0";
    return text;
}
