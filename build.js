import { spawn } from "node:child_process";

import packageJson from "./package.json" with { type: "json" };
const modules = process.argv[2]
    ? [process.argv[2]]
    : [...packageJson.workspaces].sort();

for (const moduleName of modules) {
    const childProcess = spawn("npx", ["rollup", "-c", "rollup.config.js"], {
        env: {
            ...process.env,
            MODULE_NAME: moduleName,
        },
    });

    childProcess.stdout.pipe(process.stdout);
    childProcess.stderr.pipe(process.stderr);

    const exitCode = await new Promise((resolve) => {
        childProcess.once("exit", (code) => {
            resolve(code);
        });
    });

    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
