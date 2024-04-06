import { openFile } from "../../dialog.ts";

const files = await openFile({ title: "Open Folder", directory: true });

console.log(files.map(file => ({
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    webkitRelativePath: file.webkitRelativePath,
})));
