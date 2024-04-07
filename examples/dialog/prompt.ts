import process from "node:process";

import("../../dialog.ts")
    .then(({ prompt }) => prompt('Enter something:', { gui: process.argv.includes("--gui") }))
    .then(console.log);
