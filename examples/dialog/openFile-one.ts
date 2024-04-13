import { openFile } from "../../dialog.ts";

const file = await openFile({ title: "Open File", type: "*.png,*.jpg,image/*,*/*" });

if (file) {
    console.log({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        webkitRelativePath: file.webkitRelativePath,
    });
} else {
    console.log(null);
}
