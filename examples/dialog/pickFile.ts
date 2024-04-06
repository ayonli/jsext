import pickFile from "../../dialog/pickFile.ts";

const file = await pickFile({ type: ".pdf" });

console.log(file);
console.log(file?.webkitRelativePath);

// const files = await pickFile({ multiple: true });
// console.log(files);
