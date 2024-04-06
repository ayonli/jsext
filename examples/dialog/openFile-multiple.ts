import { openFile } from "../../dialog.ts";

const files = await openFile({ multiple: true, type: ".png" });

console.log(files.map(file => ({
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    webkitRelativePath: file.webkitRelativePath,
})));
