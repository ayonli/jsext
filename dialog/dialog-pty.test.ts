import { deepStrictEqual } from "node:assert";
import { spawn, IPty, IPtyForkOptions } from "node-pty";
import { isNodePrior16 } from "../parallel/constants.ts";
import { sleep } from "../promise/index.ts";
import { END, ESC, LEFT, RIGHT, START } from "./terminal/constants.ts";

const useDeno = process.argv.includes("--deno");

async function runInSimulator(filename: string) {
    const options: IPtyForkOptions = {
        cwd: process.cwd(),
        env: process.env,
        cols: 80,
        rows: 30,
    };
    let cmd: IPty;

    if (useDeno) {
        cmd = spawn("deno", ["run", "-A", "-q", filename], options);
    } else {
        cmd = spawn("tsx", [filename], options);
    }

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

describe("dialog - " + (useDeno ? "Deno" : "Node.js"), () => {
    if (typeof document !== "undefined" || isNodePrior16) {
        return;
    }

    describe("alert", () => {
        it("press Enter", async () => {
            const { cmd, output } = await runInSimulator(`examples/dialog/alert.ts`);

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Hello, World! [Enter] ",
                "\u001b[90mundefined\u001b[39m",
                ""
            ]);
        });

        it("press Escape", async () => {
            const { cmd, output } = await runInSimulator(`examples/dialog/alert.ts`);

            cmd.write(String(ESC));
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Hello, World! [Enter] ",
                "\u001b[90mundefined\u001b[39m",
                ""
            ]);
        });
    });

    describe("confirm", () => {
        it("input 'y'", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/confirm.ts");

            cmd.write("y");
            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] y",
                "\u001b[33mtrue\u001b[39m",
                ""
            ]);
        });

        it("input 'yes'", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/confirm.ts");

            cmd.write("y");
            await sleep(10);
            cmd.write("e");
            await sleep(10);
            cmd.write("s");
            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] yes",
                "\u001b[33mtrue\u001b[39m",
                ""
            ]);
        });

        it("input 'N'", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/confirm.ts");

            cmd.write("N");
            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] N",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });

        it("input 'n'", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/confirm.ts");

            cmd.write("n");
            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] n",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });

        it("input 'no'", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/confirm.ts");

            cmd.write("n");
            await sleep(10);
            cmd.write("o");
            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] no",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });

        it("press Enter", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/confirm.ts");

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Are you sure? [y/N] ",
                "\u001b[33mfalse\u001b[39m",
                ""
            ]);
        });

        it("press Escape", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/confirm.ts");

            cmd.write(String(ESC));
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
            const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

            for (const char of "Hello, World!") {
                cmd.write(char);
                await sleep(10);
            }

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: Hello, World!",
                "Hello, World!",
                "",
            ]);
        });

        it("input '你好，世界！'", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

            for (const char of "你好，世界！") {
                cmd.write(char);
                await sleep(10);
            }

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: 你好，世界！",
                "你好，世界！",
                ""
            ]);
        });

        it("no input", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: ",
                "",
                ""
            ]);
        });

        it("default value", async () => {
            const { cmd, output } = await runInSimulator("examples/dialog/prompt-default.ts");

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: Hello, World!",
                "Hello, World!",
                ""
            ]);
        });

        it("input password", async () => {
            { // for 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt-password.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: *************",
                    "Hello, World!",
                    ""
                ]);
            }

            { // for '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt-password.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: ******",
                    "你好，世界！",
                    ""
                ]);
            }
        });

        it("press Escape", async () => {
            {
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                cmd.write(String(ESC));
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: ",
                    "\u001b[1mnull\u001b[22m",
                    ""
                ]);
            }

            {
                const { cmd, output } = await runInSimulator("examples/dialog/prompt-default.ts");

                cmd.write(String(ESC));
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: Hello, World!",
                    "\u001b[1mnull\u001b[22m",
                    ""
                ]);
            }
        });

        it("press backspace", async () => {
            { // for 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: Hello, World!\u001b[1D\u001b[0K",
                    "Hello, World",
                    ""
                ]);
            }

            { // for '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[2D\u001b[0K",
                    "你好，世界",
                    ""
                ]);
            }

            { // for password 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt-password.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: *************\u001b[1D\u001b[0K",
                    "Hello, World",
                    ""
                ]);
            }

            { // for password '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt-password.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: ******\u001b[1D\u001b[0K",
                    "你好，世界",
                    ""
                ]);
            }
        });

        it("move cursor left", async () => {
            { // for 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: Hello, World!\u001b[1D\u001b[1D\u001b[1D",
                    "Hello, World!",
                    ""
                ]);
            }

            { // for '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[2D\u001b[2D\u001b[2D",
                    "你好，世界！",
                    ""
                ]);
            }
        });

        it("move cursor right", async () => {
            { // for 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(RIGHT));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: Hello, World!\u001b[1D\u001b[1D\u001b[1C",
                    "Hello, World!",
                    ""
                ]);
            }

            { // for '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(RIGHT));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[2D\u001b[2D\u001b[2C",
                    "你好，世界！",
                    ""
                ]);
            }
        });

        it("move cursor to start", async () => {
            { // for 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(START));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: Hello, World!\u001b[13D",
                    "Hello, World!",
                    ""
                ]);
            }

            { // for '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(START));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[12D",
                    "你好，世界！",
                    ""
                ]);
            }
        });

        it("move cursor to end", async () => {
            { // for 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(END));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: Hello, World!\u001b[1D\u001b[1D\u001b[1D\u001b[3C",
                    "Hello, World!",
                    ""
                ]);
            }

            { // for '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(END));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[2D\u001b[2D\u001b[2D\u001b[6C",
                    "你好，世界！",
                    ""
                ]);
            }
        });

        it("move cursor and backspace", async () => {
            { // for 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: Hello, World!\u001b[1D\u001b[1D\u001b[1D\u001b[1D\u001b[0Kld!\u001b[3D",
                    "Hello, Wold!",
                    ""
                ]);
            }

            { // for '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[2D\u001b[2D\u001b[2D\u001b[2D\u001b[0K世界！\u001b[6D",
                    "你好世界！",
                    ""
                ]);
            }

            { // for password 'Hello, World!'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt-password.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: *************\u001b[1D\u001b[1D\u001b[1D\u001b[1D\u001b[0K***\u001b[3D",
                    "Hello, Wold!",
                    ""
                ]);
            }

            { // for password '你好，世界！'
                const { cmd, output } = await runInSimulator("examples/dialog/prompt-password.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: ******\u001b[1D\u001b[1D\u001b[1D\u001b[1D\u001b[0K***\u001b[3D",
                    "你好世界！",
                    ""
                ]);
            }
        });
    });

    describe("progress", () => {
        it("default", async function () {
            this.timeout(10_000);
            const { output } = await runInSimulator("examples/dialog/progress.ts");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Processing...\r\x1B[KProcessing.\r\x1B[KProcessing..\r\x1B[KProcessing...\r\x1B[KProcessing.",
                "Success!",
                ""
            ]);
        });

        it("update", async function () {
            this.timeout(10_000);
            const { output } = await runInSimulator("examples/dialog/progress-update.ts");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Processing...\r\x1B[KProcessing ... 0%\r\x1B[KProcessing ... 20%\r\x1B[KHalfway there! ... 50%\r\x1B[KHalfway there! ... 80%\r\x1B[KHalfway there! ... 100%",
                "Success!",
                ""
            ]);
        });

        it("cancel with fallback", async function () {
            this.timeout(10_000);
            const { cmd, output } = await runInSimulator("examples/dialog/progress-cancel-fallback.ts");

            await sleep(2500);
            cmd.write(String(ESC));

            const outputs = await output;
            deepStrictEqual(outputs, [
                "Processing...\r\x1B[KProcessing.\r\x1B[KProcessing..",
                "Failed!",
                ""
            ]);
        });

        it("cancel with exception", async function () {
            this.timeout(10_000);
            const { cmd, output } = await runInSimulator("examples/dialog/progress-cancel-throw.ts");

            await sleep(2500);
            cmd.write(String(ESC));

            const outputs = await output;
            deepStrictEqual(outputs, [
                "Processing...\r\x1B[KProcessing.\r\x1B[KProcessing..",
                "Error: Failed!",
                ""
            ]);
        });
    });
});
