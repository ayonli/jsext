import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { equals } from "./path.ts";
import { parseArgs, run, which, quote, env } from "./cli.ts";
import { platform } from "./runtime.ts";
import { isDeno } from "./env.ts";

describe("cli", () => {
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

    it("run", async function () {
        this.timeout(5000);

        const { code, stdout, stderr } = await run("echo", ["Hello, World!"]);
        strictEqual(code, 0);
        strictEqual(stdout.trim(), "Hello, World!");
        strictEqual(stderr, "");
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

    describe("env", () => {
        it("get all", () => {
            if (isDeno) {
                deepStrictEqual(env(), Deno.env.toObject());
            } else {
                deepStrictEqual(env(), process.env);
            }
        });

        it("get one", () => {
            if (isDeno) {
                strictEqual(env("HOME"), Deno.env.get("HOME"));
            } else {
                strictEqual(env("HOME"), process.env["HOME"]);
            }
        });

        it("set one", () => {
            env("FOO", "BAR");

            if (isDeno) {
                strictEqual(env("FOO"), "BAR");
            } else {
                strictEqual(env("FOO"), "BAR");
            }
        });
    });
});
