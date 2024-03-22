export default function Progress() {
    const progress = document.createElement("progress");

    progress.max = 100;
    progress.style.width = "100%";

    return progress;
}
