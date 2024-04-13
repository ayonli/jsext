import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { equals } from "./path.ts";
import { platform, parseArgs, run, which, quote } from "./cli.ts";
import { isNode, isNodeBelow16 } from "./parallel/constants.ts";
import stripAnsi from "strip-ansi";

describe("cli", () => {
    it("platform", () => {
        const platforms = [
            "android",
            "darwin",
            "freebsd",
            "linux",
            "windows",
        ];
        const others = "others";

        if (typeof Deno === "object") {
            if (platforms.includes(Deno.build.os as any)) {
                strictEqual(Deno.build.os, platform());
            } else {
                strictEqual(others, platform());
            }
        } else if (typeof process === "object" && typeof process.platform === "string") {
            if (process.platform === "win32") {
                strictEqual("windows", platform());
            } else if (platforms.includes(process.platform)) {
                strictEqual(process.platform, platform());
            } else {
                strictEqual(others, platform());
            }
        } else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
            if (navigator.userAgent.includes("Android")) {
                strictEqual("android", platform());
            } else if (navigator.userAgent.includes("Macintosh")) {
                strictEqual("darwin", platform());
            } else if (navigator.userAgent.includes("Windows")) {
                strictEqual("windows", platform());
            } else if (navigator.userAgent.includes("Linux")) {
                strictEqual("linux", platform());
            } else {
                strictEqual(others, platform());
            }
        } else {
            strictEqual(others, platform());
        }
    });

    it("parseArgs", () => {
        deepStrictEqual(parseArgs([
            "--name", "Alice",
            "--age", "20",
            "--married", "true",
            "Bob", "30",
            "--friends", "Mia",
            "--friends", "Ava",
            "--has-children",
            "--has-parents",
        ]), {
            name: "Alice",
            age: 20,
            married: true,
            _: ["Bob", 30],
            friends: ["Mia", "Ava"],
            "has-children": true,
            "has-parents": true
        });

        deepStrictEqual(parseArgs([
            "--name=Alice",
            "--age=20",
            "--married=true",
            "Bob", "30",
            "--friends=Mia",
            "--friends=Ava",
            "--has-children",
            "--has-parents",
        ]), {
            name: "Alice",
            age: 20,
            married: true,
            _: ["Bob", 30],
            friends: ["Mia", "Ava"],
            "has-children": true,
            "has-parents": true
        });

        deepStrictEqual(parseArgs([
            "Bob",
            "--age", "30",
            "--married",
            "--wife=Alice",
            "--children", "Mia",
            "--children", "Ava",
            "-p"
        ], {
            shorthands: { "p": "has-parents" }
        }), {
            _: "Bob",
            age: 30,
            married: true,
            wife: "Alice",
            children: ["Mia", "Ava"],
            "has-parents": true
        });

        deepStrictEqual(parseArgs([
            "Bob", "30",
            "-m",
            "--wife", "Alice",
        ], {
            shorthands: { "m": "married" }
        }), {
            _: ["Bob", 30],
            married: true,
            wife: "Alice",
        });

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

        if (platform() === "windows") {
            strictEqual(quote("Hello, World!"), `"Hello, World!"`);
            strictEqual(quote("Hello, World`"), `"Hello, World\`"`);
        } else {
            strictEqual(quote("Hello, World!"), `"Hello, World\\!"`);
            strictEqual(quote("Hello, World`"), `"Hello, World\\\`"`);
        }
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

    it("isTsRuntime", async function () {
        this.timeout(10_000);

        if (await which("node") && isNode) {
            {
                const { stdout } = await run("node", ["./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "false");
            }

            if (!isNodeBelow16) {
                const { stdout } = await run("npx", ["tsx", "./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }

            if (!isNodeBelow16) {
                const { stdout } = await run("npx", ["tsx", "./examples/cli/is-ts-runtime.ts"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }

            {
                const { stdout } = await run("npx", ["ts-node", "./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }
        }

        if (await which("deno")) {
            {
                const { stdout } = await run("deno", ["run", "./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }

            {
                const { stdout } = await run("deno", ["run", "./examples/cli/is-ts-runtime.ts"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }
        }

        if (await which("bun")) {
            {
                const { stdout } = await run("bun", ["run", "./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }

            {
                const { stdout } = await run("bun", ["run", "./examples/cli/is-ts-runtime.ts"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }
        }
    });
});
