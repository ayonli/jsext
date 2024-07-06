import { openFiles } from "../../dialog.ts";

const files = await openFiles({ type: "*.png,*.jpg,image/*,*/*" });

console.log(files.map(file => ({
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    webkitRelativePath: file.webkitRelativePath,
})));
