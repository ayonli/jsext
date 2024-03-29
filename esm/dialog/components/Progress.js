function Progress() {
    const div = document.createElement("div");
    const progress = document.createElement("progress");
    const span = document.createElement("span");
    div.style.width = "100%";
    div.style.display = "flex";
    div.style.justifyContent = "center";
    div.style.alignItems = "center";
    div.style.gap = "0.5em";
    progress.max = 100;
    progress.style.width = "100%";
    span.style.color = "#333";
    span.style.fontSize = "1em";
    div.appendChild(progress);
    div.appendChild(span);
    return {
        element: div,
        setValue: (value) => {
            progress.value = value;
            span.textContent = `${value}%`;
        }
    };
}

export { Progress as default };
//# sourceMappingURL=Progress.js.map
