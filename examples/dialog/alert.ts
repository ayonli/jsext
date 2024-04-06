import process from "node:process";

import("../../dialog.ts")
    .then(({ alert }) => alert("Hello, World!", { preferGUI: process.argv.includes("--gui") }))
    .then(console.log);
