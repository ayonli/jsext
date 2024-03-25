export default function Input(defaultValue = "") {
    const div = document.createElement("div");
    const input = document.createElement("input");

    div.style.display = "flex";
    div.style.margin = "0 0 1rem";

    input.autofocus = true;
    input.style.width = "100%";
    input.style.height = "32px";
    input.style.boxSizing = "border-box";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "1.5rem";
    input.style.padding = "0 1rem";
    input.style.fontSize = "1em";
    input.value = defaultValue ?? "";

    div.appendChild(input);

    return div;
}
