import process from "node:process";

import("../../dialog.ts")
    .then(({ prompt }) => prompt('Enter password:', { type: "password", gui: process.argv.includes("--gui") }))
    .then(console.log);
