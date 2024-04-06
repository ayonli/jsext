import { openFile, saveFile } from "../../dialog.ts";

const file = await openFile({
    title: "Select Source File",
});

if (file) {
    await saveFile(file, {
        title: "Save File As",
        name: file.name,
    });
}
