import process from "node:process";

import("../../dialog.ts")
    .then(({ prompt }) => prompt('Enter something:', { preferGUI: process.argv.includes("--gui") }))
    .then(console.log);
