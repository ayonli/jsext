import { deepStrictEqual, strictEqual } from "node:assert";
import { spawn } from "node:child_process";
import { until } from "../promise/index.ts";
import { isNodePrior16 } from "../parallel/constants.ts";

describe("dialog", () => {
    if (typeof document !== "undefined" || isNodePrior16) {
        return;
    }

    it("alert", async () => {
        const cmd = spawn("node", [
            "-e",
            `import("./esm/dialog/index.js").then(({ alert }) => alert("Hello, World!")).then(console.log);`
        ]);
        const outputs: string[] = [];

        cmd.stdout.on("data", (chunk: Buffer) => {
            outputs.push(String(chunk));
        });

        cmd.stdin.write("\n");

        await new Promise(resolve => {
            cmd.once("exit", resolve);
        });

        deepStrictEqual(outputs, [
            "Hello, World! [Enter] ",
            "undefined\n"
        ]);
        strictEqual(cmd.exitCode, 0);
    });

    describe("confirm", () => {
        it("input 'y'", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("y\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "true\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });

        it("input 'yes'", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("yes\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "true\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });

        it("input 'N'", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("N\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "false\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });

        it("input 'n'", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("n\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "false\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });

        it("input 'no'", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("no\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "false\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });

        it("press Enter", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "false\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });
    });

    describe("prompt", () => {
        it("input 'Hello, World!'", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ prompt }) => prompt('Enter something:')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("Hello, World!\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Enter something: ",
                "Hello, World!\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });

        it("press Enter", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ prompt }) => prompt('Enter something:')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Enter something: ",
                "\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });

        it("default value", async () => {
            const cmd = spawn("node", [
                "-e",
                `import("./esm/dialog/index.js").then(({ prompt }) => prompt('Enter something:', 'Hello, World!')).then(console.log);`
            ]);
            const outputs: string[] = [];

            cmd.stdout.on("data", (chunk: Buffer) => {
                outputs.push(String(chunk));
            });

            cmd.stdin.write("\n");

            await new Promise(resolve => {
                cmd.once("exit", resolve);
            });

            deepStrictEqual(outputs, [
                "Enter something: ",
                "Hello, World!\n"
            ]);
            strictEqual(cmd.exitCode, 0);
        });
    });

    it("progress", async function () {
        this.timeout(10_000);

        const cmd = spawn("node", ["examples/dialog.mjs"]);
        const outputs: string[] = [];

        cmd.stdout.on("data", (chunk: Buffer) => {
            outputs.push(String(chunk));

            // Node.js bug, must print `outputs` so this event keeps emitting
            // when `readline` module is used.  
            console.log(outputs);
        });

        cmd.stdin.write("\n");
        await new Promise<any>(resolve => {
            cmd.stdout.once("data", resolve);
        });

        cmd.stdin.write("y\n");
        await new Promise<any>(resolve => {
            cmd.stdout.once("data", resolve);
        });

        await until(() => outputs.includes("Success! [Enter] "));

        cmd.stdin.write("\n");
        await new Promise(resolve => {
            cmd.once("exit", resolve);
        });

        deepStrictEqual(outputs, [
            "Input message: ",
            "Confirm using 'Processing...' as title? [y/N] ",
            "\x1B[0K",
            "\x1B[0K",
            "\x1B[0K",
            "\x1B[0K",
            "\x1B[0K",
            "Success! [Enter] "
        ]);
        strictEqual(cmd.exitCode, 0);
    });
});
