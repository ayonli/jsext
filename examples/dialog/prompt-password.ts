import process from "node:process";

import("../../dialog.ts")
    .then(({ prompt }) => prompt('Enter password:', { type: "password", preferGUI: process.argv.includes("--gui") }))
    .then(console.log);
