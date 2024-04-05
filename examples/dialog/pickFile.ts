import pickFile from "../../dialog/pickFile.ts";

const file = await pickFile({ title: "Open File", type: ".png" });

console.log(file);

const files = await pickFile({ multiple: true });
console.log(files);

const dir = await pickFile({ title: "Open Folder", folder: true });
console.log(dir);

// const files = await pickFile({ multiple: true });
// console.log(files);
