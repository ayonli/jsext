import pickFile from "../../dialog/pickFile.ts";

const file = await pickFile({ type: ".png" });

console.log(file);

const files = await pickFile({ multiple: true });
console.log(files);

const dir = await pickFile({ folder: true });
console.log(dir);

// const files = await pickFile({ multiple: true });
// console.log(files);
