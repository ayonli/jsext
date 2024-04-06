import process from "node:process";

import("../../dialog.ts")
    .then(({ confirm }) => confirm("Are you sure?", { preferGUI: process.argv.includes("--gui") }))
    .then(console.log);
