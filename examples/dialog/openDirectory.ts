import { openDirectory } from "../../dialog.ts";

const files = await openDirectory({ title: "Open Folder" });

console.log(files.map(file => ({
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    webkitRelativePath: file.webkitRelativePath,
})));
