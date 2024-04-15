import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { equals } from "./path.ts";
import { platform, parseArgs, run, which, quote } from "./cli.ts";
import { isDeno, isNode, isNodeBelow16 } from "./env.ts";
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

        if (isDeno) {
            // This is a problem in Deno with the browser version of Mocha to
            // import dynamic module 'npm:iconv-lite'.
            this.skip();
        }

        const { code, stdout, stderr } = await run("echo", ["Hello, World!"]);
        strictEqual(code, 0);
        strictEqual(stdout.trim(), "Hello, World!");
        strictEqual(stderr, "");
    });

    it("which", async function () {
        this.timeout(5000);

        if (isDeno) {
            // This is a problem in Deno with the browser version of Mocha to
            // import dynamic module 'npm:iconv-lite'.
            this.skip();
        }

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

        if (isDeno) {
            // This is a problem in Deno with the browser version of Mocha to
            // import dynamic module 'npm:iconv-lite'.
            this.skip();
        }

        if (await which("node") && isNode) {
            {
                const { stdout } = await run("node", ["./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "false");
            }

            if (platform() !== "windows") {
                const { stdout } = await run("npx", ["ts-node", "./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }

            if (platform() !== "windows" && !isNodeBelow16) {
                const { stdout } = await run("npx", ["tsx", "./examples/cli/is-ts-runtime.js"]);
                strictEqual(stripAnsi(stdout.trim()), "true");
            }

            if (platform() !== "windows" && !isNodeBelow16) {
                const { stdout } = await run("npx", ["tsx", "./examples/cli/is-ts-runtime.ts"]);
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
