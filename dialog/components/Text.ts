export default function Text(message: string) {
    const text = document.createElement("p");
    text.textContent = message;
    text.style.marginBlockStart = "0";
    text.style.fontSize = "0.9rem";
    return text;
}
