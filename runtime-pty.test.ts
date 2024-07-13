import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { spawn, IPty, IPtyForkOptions } from "node-pty";
import { isNodeBelow16, isNodeBelow20 } from "./env.ts";
import { ControlKeys } from "./cli/constants.ts";
import { isBrowserWindow } from "./env.ts";
import stripAnsi from 'strip-ansi';
import { platform } from "./runtime.ts";
import { lines } from "./string.ts";
import { sleep } from "./async.ts";

const { CTRL_C } = ControlKeys;

const useDeno = process.argv.includes("--deno");
const useBun = process.argv.includes("--bun");

async function runInEmulator(filename: string, args: string[] = []) {
    const options: IPtyForkOptions = {
        cwd: process.cwd(),
        env: process.env,
        cols: 80,
        rows: 30,
    };
    let cmd: IPty;

    if (useDeno) {
        cmd = spawn("deno", filename ? ["run", "-A", "-q", filename, ...args] : [...args], options);
    } else if (useBun) {
        cmd = spawn("bun", filename ? ["run", filename, ...args] : ["repl", ...args], options);
    } else {
        cmd = spawn("tsx", filename ? [filename, ...args] : [...args], options);
    }

    const _outputs: string[] = [];
    const result = new Promise<number>(resolve => {
        cmd.onExit(({ exitCode }) => resolve(exitCode));
    }).then((code) => ({
        code,
        outputs: lines(_outputs.join("")).map(stripAnsi),
    }));

    await new Promise<void>(resolve => {
        cmd.onData((chunk) => {
            _outputs.push(chunk);
            resolve();
        });
    });

    return {
        cmd,
        result,
    };
}

describe("runtime - " + (useDeno ? "Deno" : useBun ? "Bun" : "Node.js"), () => {
    if (isBrowserWindow || isNodeBelow16 || ((useDeno || useBun) && isNodeBelow20)) {
        return;
    }

    describe("addShutdownListener", () => {
        const filename = "./examples/runtime/add-shutdown-listener.ts";

        if (useDeno || useBun) {
            // Node-pty isn't stable with Deno or Bun when emitting SIGINT
            // or simulating Ctrl+C, so we skip these tests.
            return;
        }

        it("press Ctrl+C", async function () {
            const { cmd, result } = await runInEmulator(filename);

            cmd.write(String(CTRL_C));
            const { code, outputs } = await result;

            strictEqual(code, 0);

            try {
                deepStrictEqual(outputs, [
                    "ready",
                    "^Cclose 1",
                    "close 2",
                    ""
                ]);
            } catch {
                deepStrictEqual(outputs, [
                    "ready",
                    "^C",
                    "close 1",
                    "close 2",
                    ""
                ]);
            }
        });

        it("kill with SIGINT", async function () {
            if (platform() === "windows") {
                this.skip();
            }

            const { cmd, result } = await runInEmulator(filename);

            cmd.kill("SIGINT");
            const { code, outputs } = await result;

            strictEqual(code, 0);
            deepStrictEqual(outputs, [
                "ready",
                "close 1",
                "close 2",
                ""
            ]);
        });

        it("prevent exit", async function () {
            this.timeout(5_000);

            const { cmd, result } = await runInEmulator(filename, ["--prevent-exit"]);

            cmd.write(String(CTRL_C));
            const { code, outputs } = await result;

            strictEqual(code, 1);
            try {
                deepStrictEqual(outputs, [
                    "ready",
                    "^Cclose 1",
                    "close 2",
                    "manual close",
                    ""
                ]);
            } catch {
                deepStrictEqual(outputs, [
                    "ready",
                    "^C",
                    "close 1",
                    "close 2",
                    "manual close",
                    ""
                ]);
            }
        });
    });

    describe("addUnhandledRejectionListener", () => {
        const filename = "./examples/runtime/add-unhandled-rejection-listener.ts";

        it("no-action", async () => {
            const { result } = await runInEmulator(filename, ["--no-action"]);
            const { code, outputs } = await result;

            strictEqual(code, 1);
            ok(outputs.some((output) => output.includes("Uncaught (in promise)")));
        });

        it("log", async () => {
            const { result } = await runInEmulator(filename, ["--log"]);
            const { code, outputs } = await result;

            strictEqual(code, 1);
            ok(outputs.some((output) => output === "Error: Unintentional error"));
            ok(outputs.some((output) => output === "true"));
        });

        it("prevent-exit", async () => {
            const { result } = await runInEmulator(filename, ["--prevent-exit"]);
            const { code, outputs } = await result;

            strictEqual(code, 0);
            ok(outputs.some((output) => output === "Error: Unintentional error"));
        });
    });

    describe("refTimer and unrefTimer", () => {
        const filename = "./examples/runtime/ref-unref-timer.ts";

        it("default", async () => {
            const { result } = await runInEmulator(filename);
            const { code, outputs } = await result;

            strictEqual(code, 0);
            deepStrictEqual(outputs, [
                "ready",
                "close late",
                ""
            ]);
        });

        it("unref", async () => {
            const { result } = await runInEmulator(filename, ["--unref"]);
            const { code, outputs } = await result;

            strictEqual(code, 0);
            deepStrictEqual(outputs, [
                "ready",
                ""
            ]);
        });

        it("ref", async () => {
            const { result } = await runInEmulator(filename, ["--ref"]);
            const { code, outputs } = await result;

            strictEqual(code, 0);
            deepStrictEqual(outputs, [
                "ready",
                "close late",
                ""
            ]);
        });
    });

    describe("isREPL", () => {
        const filename = "./examples/runtime/is-repl.ts";

        it("not in REPL", async () => {
            const { result } = await runInEmulator(filename);
            const { code, outputs } = await result;

            strictEqual(code, 0);
            strictEqual(outputs[0], "false");
        });

        it("in REPL", async function () {
            if (useBun) {
                // Node-pty isn't able to correctly emulate the Bun REPL.
                this.skip();
            } else if (useDeno && platform() === "linux") {
                // Node-pty isn't able to correctly emulate the Deno REPL on Linux.
                this.skip();
            }

            this.timeout(10_000);

            const { cmd, result } = await runInEmulator("");

            await sleep(100);
            cmd.write(`await import("${filename}")`);
            cmd.write("\n");

            await sleep(100);

            if (useDeno) {
                cmd.write("close()");
            } else {
                cmd.write(".exit");
            }

            cmd.write("\n");

            const { code, outputs } = await result;

            strictEqual(code, 0);
            ok(outputs.some((output) => output === "true"));
        });
    });
});
