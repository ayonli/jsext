import { deepStrictEqual } from "node:assert";
import { spawn, IPty, IPtyForkOptions } from "node-pty";
import { isNodeBelow16, isNodeBelow20 } from "@jsext/env";
import { sleep } from "@jsext/async";
import { ControlKeys, NavigationKeys } from "@jsext/cli/constants";
import { isBrowserWindow } from "@jsext/env";
import stripAnsi from 'strip-ansi';

const { CTRL_E, ESC, CTRL_A } = ControlKeys;
const { LEFT, RIGHT } = NavigationKeys;

const useDeno = process.argv.includes("--deno");
const useBun = process.argv.includes("--bun");

async function runInEmulator(filename: string) {
    const options: IPtyForkOptions = {
        cwd: process.cwd(),
        env: process.env,
        cols: 80,
        rows: 30,
    };
    let cmd: IPty;

    if (useDeno) {
        cmd = spawn("deno", ["run", "-A", "-q", filename], options);
    } else if (useBun) {
        cmd = spawn("bun", ["run", filename], options);
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

describe("dialog - " + (useDeno ? "Deno" : useBun ? "Bun" : "Node.js"), () => {
    if (isBrowserWindow || isNodeBelow16 || ((useDeno || useBun) && isNodeBelow20)) {
        return;
    }

    describe("alert", () => {
        it("press Enter", async () => {
            const { cmd, output } = await runInEmulator(`examples/dialog/alert.ts`);

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Hello, World! [Enter] ",
                "undefined",
                ""
            ]);
        });

        it("press Escape", async () => {
            const { cmd, output } = await runInEmulator(`examples/dialog/alert.ts`);

            cmd.write(String(ESC));
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Hello, World! [Enter] ",
                "undefined",
                ""
            ]);
        });
    });

    describe("confirm", () => {
        it("input 'y'", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/confirm.ts");

            cmd.write("y");
            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Are you sure? [Y/n] y",
                "true",
                ""
            ]);
        });

        it("input 'yes'", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/confirm.ts");

            for (const char of "yes") {
                cmd.write(char);
                await sleep(10);
            }

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Are you sure? [Y/n] yes",
                "true",
                ""
            ]);
        });

        it("input 'n'", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/confirm.ts");

            cmd.write("n");
            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Are you sure? [Y/n] n",
                "false",
                ""
            ]);
        });

        it("input 'no'", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/confirm.ts");

            for (const char of "no") {
                cmd.write(char);
                await sleep(10);
            }

            await sleep(10);
            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Are you sure? [Y/n] no",
                "false",
                ""
            ]);
        });

        it("press Enter", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/confirm.ts");

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Are you sure? [Y/n] ",
                "true",
                ""
            ]);
        });

        it("press Escape", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/confirm.ts");

            cmd.write(String(ESC));
            const outputs = await output;

            deepStrictEqual(outputs.map(stripAnsi), [
                "Are you sure? [Y/n] ",
                "false",
                ""
            ]);
        });
    });

    describe("prompt", () => {
        it("input 'Hello, World!'", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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
            const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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

        it("input emojis", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

            for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                cmd.write(char);
                await sleep(10);
            }

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: 👋🌍🚀♥️♣",
                "👋🌍🚀♥️♣",
                ""
            ]);
        });

        it("no input", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: ",
                "",
                ""
            ]);
        });

        it("default value", async () => {
            const { cmd, output } = await runInEmulator("examples/dialog/prompt-default.ts");

            cmd.write("\n");
            const outputs = await output;

            deepStrictEqual(outputs, [
                "Enter something: Hello, World!",
                "Hello, World!",
                ""
            ]);
        });

        it("input password", async function () {
            this.timeout(5_000);

            { // for 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

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

            { // for emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: *****",
                    "👋🌍🚀♥️♣",
                    ""
                ]);
            }
        });

        it("press Escape", async () => {
            {
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                cmd.write(String(ESC));
                const outputs = await output;

                deepStrictEqual(outputs.map(stripAnsi), [
                    "Enter something: ",
                    "null",
                    ""
                ]);
            }

            {
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-default.ts");

                cmd.write(String(ESC));
                const outputs = await output;

                deepStrictEqual(outputs.map(stripAnsi), [
                    "Enter something: Hello, World!",
                    "null",
                    ""
                ]);
            }
        });

        it("press backspace", async function () {
            this.timeout(5_000);

            { // for 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[2D\u001b[0K\u001b[2D\u001b[0K",
                    "你好，世",
                    ""
                ]);
            }

            { // for emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 👋🌍🚀♥️♣\u001b[1D\u001b[0K\u001b[1D\u001b[0K\u001b[2D\u001b[0K",
                    "👋🌍",
                    ""
                ]);
            }

            { // for password 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

                for (const char of "你好，世界！") {
                    char && cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: ******\u001b[1D\u001b[0K\u001b[1D\u001b[0K",
                    "你好，世",
                    ""
                ]);
            }

            { // for password emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write("\b");
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: *****\u001b[1D\u001b[0K\u001b[1D\u001b[0K\u001b[1D\u001b[0K",
                    "👋🌍",
                    ""
                ]);
            }
        });

        it("move cursor left", async function () {
            this.timeout(5_000);

            { // for 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    char && cmd.write(char);
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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    char && cmd.write(char);
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

            { // for emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
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
                    "Enter something: 👋🌍🚀♥️♣\u001b[1D\u001b[1D\u001b[2D",
                    "👋🌍🚀♥️♣",
                    ""
                ]);
            }
        });

        it("move cursor right", async function () {
            this.timeout(5_000);

            { // for 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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

            { // for emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(RIGHT));
                await sleep(10);
                cmd.write(String(RIGHT));
                await sleep(10);
                cmd.write(String(RIGHT));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 👋🌍🚀♥️♣\u001b[1D\u001b[1D\u001b[2D\u001b[2C\u001b[1C\u001b[1C",
                    "👋🌍🚀♥️♣",
                    ""
                ]);
            }
        });

        it("move cursor to start", async function () {
            this.timeout(5_000);

            { // for 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of "Hello, World!") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(CTRL_A));
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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(CTRL_A));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[12D",
                    "你好，世界！",
                    ""
                ]);
            }

            { // for emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(CTRL_A));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 👋🌍🚀♥️♣\u001b[8D",
                    "👋🌍🚀♥️♣",
                    ""
                ]);
            }
        });

        it("move cursor to end", async function () {
            this.timeout(5_000);

            { // for 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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
                cmd.write(String(CTRL_E));
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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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
                cmd.write(String(CTRL_E));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 你好，世界！\u001b[2D\u001b[2D\u001b[2D\u001b[6C",
                    "你好，世界！",
                    ""
                ]);
            }

            { // for emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(CTRL_E));
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter something: 👋🌍🚀♥️♣\u001b[1D\u001b[1D\u001b[2D\u001b[4C",
                    "👋🌍🚀♥️♣",
                    ""
                ]);
            }
        });

        it("move cursor and backspace", async function () {
            this.timeout(5_000);

            { // for 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of "你好，世界！") {
                    char && cmd.write(char);
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

            { // for emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
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
                    "Enter something: 👋🌍🚀♥️♣\u001b[1D\u001b[1D\u001b[2D\u001b[2D\u001b[0K🚀♥️♣\u001b[4D",
                    "👋🚀♥️♣",
                    ""
                ]);
            }

            { // for password 'Hello, World!'
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

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
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

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

            { // for password emojis
                const { cmd, output } = await runInEmulator("examples/dialog/prompt-password.ts");

                for (const char of ["👋", "🌍", "🚀", "♥️", "♣"]) {
                    cmd.write(char);
                    await sleep(10);
                }

                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write(String(LEFT));
                await sleep(10);
                cmd.write("\b");
                await sleep(10);
                cmd.write("\n");
                const outputs = await output;

                deepStrictEqual(outputs, [
                    "Enter password: *****\u001b[1D\u001b[1D\u001b[1D\u001b[0K**\u001b[2D",
                    "👋🌍♥️♣",
                    ""
                ]);
            }
        });
    });

    describe("progress", () => {
        it("default", async function () {
            this.timeout(10_000);
            const { output } = await runInEmulator("examples/dialog/progress.ts");
            const outputs = await output;

            deepStrictEqual(outputs, [
                [
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [=     ]",
                    "\r\u001b[KProcessing... [==    ]",
                    "\r\u001b[KProcessing... [===   ]",
                    "\r\u001b[KProcessing... [ ===  ]",
                    "\r\u001b[KProcessing... [  === ]",
                    "\r\u001b[KProcessing... [   ===]",
                    "\r\u001b[KProcessing... [    ==]",
                    "\r\u001b[KProcessing... [     =]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [=     ]",
                    "\r\u001b[KProcessing... [==    ]",
                    "\r\u001b[KProcessing... [===   ]",
                    "\r\u001b[KProcessing... [ ===  ]",
                    "\r\u001b[KProcessing... [  === ]",
                    "\r\u001b[KProcessing... [   ===]",
                    "\r\u001b[KProcessing... [    ==]",
                    "\r\u001b[KProcessing... [     =]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [=     ]",
                    "\r\u001b[KProcessing... [==    ]",
                    "\r\u001b[KProcessing... [===   ]",
                    "\r\u001b[KProcessing... [ ===  ]",
                ].join(""),
                "Success!",
                ""
            ]);
        });

        it("update", async function () {
            this.timeout(10_000);
            const { output } = await runInEmulator("examples/dialog/progress-update.ts");
            const outputs = await output;

            deepStrictEqual(outputs, [
                [
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [------------------------------------------------------------] 0%",
                    "\r\u001b[KProcessing... [###########------------------------------------------------] 20%",
                    "\r\u001b[KHalfway there! [#############################-----------------------------] 50%",
                    "\r\u001b[KHalfway there! [##############################################------------] 80%",
                    "\r\u001b[KHalfway there! [#########################################################] 100%",
                ].join(""),
                "Success!",
                ""
            ]);
        });

        it("cancel with fallback", async function () {
            this.timeout(10_000);
            const { cmd, output } = await runInEmulator("examples/dialog/progress-cancel-fallback.ts");

            await sleep(2500);
            cmd.write(String(ESC));

            const outputs = await output;
            deepStrictEqual(outputs, [
                [
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [=     ]",
                    "\r\u001b[KProcessing... [==    ]",
                    "\r\u001b[KProcessing... [===   ]",
                    "\r\u001b[KProcessing... [ ===  ]",
                    "\r\u001b[KProcessing... [  === ]",
                    "\r\u001b[KProcessing... [   ===]",
                    "\r\u001b[KProcessing... [    ==]",
                    "\r\u001b[KProcessing... [     =]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [=     ]",
                    "\r\u001b[KProcessing... [==    ]",
                ].join(""),
                "Failed!",
                ""
            ]);
        });

        it("cancel with exception", async function () {
            this.timeout(10_000);
            const { cmd, output } = await runInEmulator("examples/dialog/progress-cancel-throw.ts");

            await sleep(2500);
            cmd.write(String(ESC));

            const outputs = await output;
            deepStrictEqual(outputs, [
                [
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [=     ]",
                    "\r\u001b[KProcessing... [==    ]",
                    "\r\u001b[KProcessing... [===   ]",
                    "\r\u001b[KProcessing... [ ===  ]",
                    "\r\u001b[KProcessing... [  === ]",
                    "\r\u001b[KProcessing... [   ===]",
                    "\r\u001b[KProcessing... [    ==]",
                    "\r\u001b[KProcessing... [     =]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [      ]",
                    "\r\u001b[KProcessing... [=     ]",
                    "\r\u001b[KProcessing... [==    ]",
                ].join(""),
                "Error: Failed!",
                ""
            ]);
        });
    });
});
