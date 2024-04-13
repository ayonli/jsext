import process from "node:process";
import { sudo } from "../../cli.ts";

const result = await sudo("echo", ["Hello, World!"], {
    gui: process.argv.includes("--gui")
});

console.log(result);
