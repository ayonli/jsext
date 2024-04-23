import { deepStrictEqual, strictEqual } from "node:assert";
import runtime, { platform } from "./runtime.ts";
import { isBun, isDeno, isNode } from "./env.ts";

declare const Bun: any;

describe("runtime", () => {
    it("runtime", () => {
        if (isNode) {
            deepStrictEqual(runtime(), {
                identity: "node",
                version: process.version.slice(1),
                tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                    || /\.tsx?$|\bvite\b/.test(process.argv[1] ?? "")
            });
        } else if (isDeno) {
            deepStrictEqual(runtime(), {
                identity: "deno",
                version: Deno.version.deno,
                tsSupport: true
            });
        } else if (isBun) {
            deepStrictEqual(runtime(), {
                identity: "bun",
                version: Bun.version,
                tsSupport: true
            });
        }
    });

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
});
