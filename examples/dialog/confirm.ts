import process from "node:process";

import("../../dialog.ts")
    .then(({ confirm }) => confirm("Are you sure?", { gui: process.argv.includes("--gui") }))
    .then(console.log);
