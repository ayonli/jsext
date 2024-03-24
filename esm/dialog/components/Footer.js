function Footer(...children) {
    const bottom = document.createElement("footer");
    bottom.style.display = "flex";
    bottom.style.justifyContent = "flex-end";
    bottom.style.alignItems = "center";
    bottom.style.gap = "0.5em";
    children.forEach(node => {
        bottom.appendChild(node);
    });
    return bottom;
}

export { Footer as default };
//# sourceMappingURL=Footer.js.map
