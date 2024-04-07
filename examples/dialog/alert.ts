import process from "node:process";

import("../../dialog.ts")
    .then(({ alert }) => alert("Hello, World!", { gui: process.argv.includes("--gui") }))
    .then(console.log);
