import process from "node:process";
import { pickFile } from "../../dialog.ts";

const filename = await pickFile({
    save: process.argv.includes("--save"),
    defaultName: process.argv[3],
});

console.log(filename);
