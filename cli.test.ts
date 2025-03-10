import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { equals } from "./path.ts";
import {
    ControlKeys,
    FunctionKeys,
    NavigationKeys,
    args,
    charWidth,
    getWindowSize,
    isTTY,
    isTypingInput,
    parseArgs,
    quote,
    run,
    stringWidth,
    which,
} from "./cli.ts";
import { platform } from "./runtime.ts";
import { chars } from "./string.ts";
import bytes from "./bytes.ts";
import { isDeno, isNodeBelow16 } from "./env.ts";
import { try_ } from "./result.ts";
import { as } from "./object.ts";

const str1 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const str2 = "你好，世界！";
const str3 = "👋🌍🚀♥️♣";

const NonTypingKeys = [
    ...Object.values(ControlKeys),
    ...Object.values(NavigationKeys),
    ...Object.values(FunctionKeys),
];

describe("cli", () => {
    it("args", () => {
        if (isDeno) {
            deepStrictEqual(args, Deno.args);
        } else {
            deepStrictEqual(args, process.argv.slice(2));
        }
    });

    it("isTTY", () => {
        if (isDeno) {
            strictEqual(isTTY, Deno.stdin.isTerminal());
        } else {
            strictEqual(isTTY, process.stdin.isTTY);
        }
    });

    it("charWidth", () => {
        chars("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").forEach(char => {
            strictEqual(charWidth(char), 1);
        });

        chars("你好，世界！").forEach(char => {
            strictEqual(charWidth(char), 2);
        });

        strictEqual(charWidth("👋"), 2);
        strictEqual(charWidth("🌍"), 2);
        strictEqual(charWidth("🚀"), 2);
        strictEqual(charWidth("♥️"), 1);
        strictEqual(charWidth("♣"), 1);
    });

    it("stringWidth", () => {
        strictEqual(stringWidth(str1), 62);
        strictEqual(stringWidth(str2), 12);

        if (!isNodeBelow16) {
            strictEqual(stringWidth(str3), 8);
        }
    });

    it("isTypingInput", () => {
        strictEqual(isTypingInput(bytes(str1)), true);
        Array.from(str1).forEach(char => {
            strictEqual(isTypingInput(bytes(char)), true);
        });

        strictEqual(isTypingInput(bytes(str2)), true);
        Array.from(str2).forEach(char => {
            strictEqual(isTypingInput(bytes(char)), true);
        });

        strictEqual(isTypingInput(bytes(str3)), true);
        Array.from(str3).forEach(char => {
            strictEqual(isTypingInput(bytes(char)), true);
        });

        NonTypingKeys.forEach(key => {
            strictEqual(isTypingInput(bytes(key)), false);
        });
    });

    it("getWindowSize", () => {
        if (isDeno) {
            try {
                const { columns, rows } = Deno.consoleSize();
                deepStrictEqual(getWindowSize(), { width: columns, height: rows });
            } catch {
                deepStrictEqual(getWindowSize(), { width: 0, height: 0 });
            }
        } else {
            const columns = process.stdout.columns;
            const rows = process.stdout.rows;
            deepStrictEqual(getWindowSize(), { width: columns, height: rows });
        }
    });

    it("parseArgs", () => {
        deepStrictEqual(parseArgs([
            "Bob", "30",
            "--married",
            "--wife", "Alice",
            "--age", "20",
            "--children", "Mia",
            "--children", "Ava",
            "--has-children=true",
            "--has-parents=false",
            "--has-pets", "true",
        ]), {
            0: "Bob",
            1: 30,
            married: true,
            wife: "Alice",
            age: 20,
            children: "Ava",
            "has-children": true,
            "has-parents": false,
            "has-pets": true,
        });

        // test lists option
        deepStrictEqual(parseArgs([
            "Bob", "30",
            "--married",
            "--wife", "Alice",
            "--age", "20",
            "--children", "Mia",
            "--children", "Ava",
            "--has-children=true",
            "--has-parents=false",
            "--has-pets", "true",
        ], {
            lists: ["children"],
        }), {
            0: "Bob",
            1: 30,
            married: true,
            wife: "Alice",
            age: 20,
            children: ["Mia", "Ava"],
            "has-children": true,
            "has-parents": false,
            "has-pets": true,
        });

        // test alias option
        deepStrictEqual(parseArgs([
            "Bob", "30",
            "--married",
            "--wife", "Alice",
            "--age", "20",
            "--children", "Mia",
            "--children", "Ava",
            "--has-children=true",
            "--has-parents=false",
            "-p"
        ], {
            lists: ["children"],
            alias: { "p": "has-pets" }
        }), {
            0: "Bob",
            1: 30,
            married: true,
            wife: "Alice",
            age: 20,
            children: ["Mia", "Ava"],
            "has-children": true,
            "has-parents": false,
            "has-pets": true,
        });

        // test noCoercion option
        deepStrictEqual(parseArgs([
            "Bob", "30",
            "--married",
            "--wife", "Alice",
            "--age", "20",
            "--children", "Mia",
            "--children", "Ava",
            "--has-children=true",
            "--has-parents=false",
            "--has-pets", "true",
        ], {
            noCoercion: true,
        }), {
            0: "Bob",
            1: "30",
            married: true,
            wife: "Alice",
            age: "20",
            children: "Ava",
            "has-children": "true",
            "has-parents": "false",
            "has-pets": "true",
        });

        // test noCoercion option with specific keys
        deepStrictEqual(parseArgs([
            "Bob", "30",
            "--married",
            "--wife", "Alice",
            "--age", "20",
            "--children", "Mia",
            "--children", "Ava",
            "--has-children=true",
            "--has-parents=false",
            "--has-pets", "true",
        ], {
            noCoercion: ["1", "age"],
        }), {
            0: "Bob",
            1: "30",
            married: true,
            wife: "Alice",
            age: "20",
            children: "Ava",
            "has-children": true,
            "has-parents": false,
            "has-pets": true,
        });

        // test "--"
        deepStrictEqual(parseArgs([
            "Bob", "30",
            "--married",
            "--wife", "Alice",
            "--age", "20",
            "--",
            "--children", "Mia",
            "--children", "Ava",
            "--has-children=true",
            "--has-parents=false",
            "-p"
        ], {
            lists: ["children"],
            alias: { "p": "has-pets" }
        }), {
            0: "Bob",
            1: 30,
            married: true,
            wife: "Alice",
            age: 20,
            "--": [
                "--children", "Mia",
                "--children", "Ava",
                "--has-children=true",
                "--has-parents=false",
                "-p"
            ],
        });

        // test others
        deepStrictEqual(parseArgs(["--gui=true"]), { gui: true });
        deepStrictEqual(parseArgs(["--save"]), { save: true });
        deepStrictEqual(parseArgs(["-s"]), { s: true });
    });

    it("quote", () => {
        strictEqual(quote("foo"), "foo");
        strictEqual(quote("foo's"), `"foo's"`);
        strictEqual(quote("foo$bar"), "foo\\$bar");
        strictEqual(quote("foo\\bar"), "foo\\\\bar");
        strictEqual(quote("foo bar"), `"foo bar"`);

        strictEqual(quote("Hello, World!"), `"Hello, World!"`);
        strictEqual(quote("Hello, World`"), `"Hello, World\`"`);
    });

    describe("run", () => {
        it("success", async function () {
            this.timeout(5000);

            const { code, stdout, stderr } = await run("echo", ["Hello, World!"]);
            strictEqual(code, 0);
            strictEqual(stdout.trim(), "Hello, World!");
            strictEqual(stderr, "");
        });

        it("abort", async function () {
            this.timeout(5000);

            const controller = new AbortController();
            const { signal } = controller;
            const task = run("echo", ["Hello, World!"], { signal });

            controller.abort();
            const result = await try_(task);
            strictEqual(result.ok, false);
            strictEqual(as(result.error, Error)?.name, "AbortError");
        });
    });

    it("which", async function () {
        this.timeout(5000);

        if (platform() === "windows") {
            ok(equals(
                await which("powershell") ?? "",
                "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                { caseInsensitive: true }
            ));
        } else {
            const ls = await which("ls");

            try {
                strictEqual(ls, "/bin/ls");
            } catch {
                strictEqual(ls, "/usr/bin/ls");
            }
        }
    });
});
