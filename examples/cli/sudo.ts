import process from "node:process";
import { sudo } from "../../cli.ts";

const result = await sudo("echo", ["你好, 世界!"], {
    gui: process.argv.includes("--gui")
});

console.log(result);
