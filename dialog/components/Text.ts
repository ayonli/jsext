export default function Text(message: string) {
    const text = document.createElement("p");
    text.textContent = message;
    text.style.margin = "0 0 1rem";
    return text;
}
