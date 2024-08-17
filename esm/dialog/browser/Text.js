function Text(message) {
    const text = document.createElement("p");
    text.innerHTML = message.replace(/ /g, "&nbsp;").replace(/\n/g, "<br />");
    text.style.margin = "0 0 1rem";
    text.style.fontSize = "1em";
    return text;
}

export { Text as default };
//# sourceMappingURL=Text.js.map
