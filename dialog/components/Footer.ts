export default function Footer(...children: HTMLElement[]) {
    const bottom = document.createElement("footer");

    bottom.style.display = "flex";
    bottom.style.justifyContent = "flex-end";
    bottom.style.gap = "0.5em";

    children.forEach(node => {
        bottom.appendChild(node);
    });

    return bottom;
}
