import { useColorTheme } from './util.js';

const lightBgColor = "#fff";
const darkBgColor = "#222";
const lightTextColor = "#000";
const darkTextColor = "#fff";
function Input(defaultValue = "") {
    const div = document.createElement("div");
    const input = document.createElement("input");
    const { theme, onChange } = useColorTheme();
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
    input.style.color = theme === "light" ? lightTextColor : darkTextColor;
    input.style.backgroundColor = theme === "light" ? lightBgColor : darkBgColor;
    input.value = defaultValue !== null && defaultValue !== void 0 ? defaultValue : "";
    onChange((theme) => {
        input.style.color = theme === "light" ? lightTextColor : darkTextColor;
        input.style.backgroundColor = theme === "light" ? lightBgColor : darkBgColor;
    });
    div.appendChild(input);
    return div;
}

export { Input as default };
//# sourceMappingURL=Input.js.map
