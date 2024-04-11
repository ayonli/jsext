import { ok, strictEqual } from "node:assert";
import { equals } from "./path.ts";
import { platform, run, which } from "./terminal.ts";

describe("terminal", () => {
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
});
