import { deepStrictEqual } from "node:assert";
import { spawn } from "node-pty";
// import { until } from "../promise/index.ts";
import { isNodePrior16 } from "../parallel/constants.ts";
import { sleep } from "../promise/index.ts";

async function runInNodeSimulator(code: string) {
    const cmd = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        env: process.env,
        cols: 80,
        rows: 30,
    });
    const _outputs: string[] = [];
    const output = new Promise(resolve => {
        cmd.onExit(resolve);
    }).then(() => _outputs.join("").split(/\r\n|\n/));

    await new Promise<void>(resolve => {
        cmd.onData((chunk) => {
            _outputs.push(chunk);
            resolve();
        });
    });

    return {
        cmd,
        output,
    };
}

describe("dialog", () => {
    if (typeof document !== "undefined" || isNodePrior16) {
        return;
    }

    it("alert", async () => {
        const { cmd, output } = await runInNodeSimulator(
            `import("./esm/dialog/index.js").then(({ alert }) => alert("Hello, World!")).then(console.log);`
        );

        cmd.write("\n");
        const outputs = await output;

        deepStrictEqual(outputs, [
            "Hello, World! [Enter] ",
            "\u001b[90mundefined\u001b[39m",
            ""
        ]);
    });

    describe("confirm", () => {
        it("input 'y'", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm("Are you sure?")).then(console.log);`
            );

            cmd.write("y");
            await sleep(100);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] y",
                "\u001b[33mtrue\u001b[39m",
                ""
            ]);
        });

        it("input 'yes'", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            );

            cmd.write("yes");
            await sleep(100);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] yes",
                "\u001b[33mtrue\u001b[39m",
                ""
            ]);
        });

        it("input 'N'", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            );

            cmd.write("N");
            await sleep(100);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] N",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });

        it("input 'n'", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            );

            cmd.write("n");
            await sleep(100);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] n",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });

        it("input 'no'", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            );

            cmd.write("no");
            await sleep(100);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] no",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });

        it("press Enter", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ confirm }) => confirm('Are you sure?')).then(console.log);`
            );

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });
    });

    describe("prompt", () => {
        it("input 'Hello, World!'", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ prompt }) => prompt('Enter something:')).then(console.log);`
            );

            cmd.write("Hello, World!");
            await sleep(100);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: Hello, World!",
                "Hello, World!",
                "",
            ]);
        });

        it("press Enter", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ prompt }) => prompt('Enter something:')).then(console.log);`
            );

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: ",
                "",
                ""
            ]);
        });

        it("default value", async () => {
            const { cmd, output } = await runInNodeSimulator(
                `import("./esm/dialog/index.js").then(({ prompt }) => prompt('Enter something:', 'Hello, World!')).then(console.log);`
            );

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: Hello, World!",
                "Hello, World!",
                ""
            ]);
        });
    });

    // it("progress", async function () {
    //     this.timeout(10_000);

    //     const cmd = spawn("node", ["examples/dialog.mjs"]);
    //     const outputs: string[] = [];

    //     cmd.stdout.on("data", (chunk: Buffer) => {
    //         outputs.push(String(chunk));

    //         // Node.js bug, must print `outputs` so this event keeps emitting
    //         // when `readline` module is used.  
    //         console.log(outputs);
    //     });

    //     cmd.stdin.write("\n");
    //     await new Promise<any>(resolve => {
    //         cmd.stdout.once("data", resolve);
    //     });

    //     cmd.stdin.write("y\n");
    //     await new Promise<any>(resolve => {
    //         cmd.stdout.once("data", resolve);
    //     });

    //     await until(() => outputs.includes("Success! [Enter] "));

    //     cmd.stdin.write("\n");
    //     await new Promise(resolve => {
    //         cmd.once("exit", resolve);
    //     });

    //     deepStrictEqual(outputs, [
    //         "Input message: ",
    //         "Confirm using 'Processing...' as title? [y/N] ",
    //         "\x1B[0K",
    //         "\x1B[0K",
    //         "\x1B[0K",
    //         "\x1B[0K",
    //         "\x1B[0K",
    //         "Success! [Enter] "
    //     ]);
    //     strictEqual(cmd.exitCode, 0);
    // });
});
