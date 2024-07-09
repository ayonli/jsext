import { deepStrictEqual, strictEqual } from "node:assert";
import * as util from "node:util";
import runtime, { platform, env, customInspect, RuntimeInfo } from "./runtime.ts";
import { isBun, isDeno, isNode } from "./env.ts";

declare const Bun: any;

describe("runtime", () => {
    it("runtime", () => {
        if (isNode) {
            deepStrictEqual(runtime(), {
                type: "node",
                version: process.version.slice(1),
                fsSupport: true,
                tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                    || /\.tsx?$|\bvite\b/.test(process.argv[1] ?? ""),
                worker: undefined,
            } as RuntimeInfo);
        } else if (isDeno) {
            deepStrictEqual(runtime(), {
                type: "deno",
                version: Deno.version.deno,
                fsSupport: true,
                tsSupport: true,
                worker: undefined,
            } as RuntimeInfo);
        } else if (isBun) {
            deepStrictEqual(runtime(), {
                type: "bun",
                version: Bun.version,
                fsSupport: true,
                tsSupport: true,
                worker: undefined,
            } as RuntimeInfo);
        }
    });

    it("platform", () => {
        const platforms = [
            "darwin",
            "linux",
            "windows",
        ];
        const others = "others";

        if (typeof Deno === "object") {
            if (platforms.includes(Deno.build.os)) {
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
            strictEqual(env("FOO"), "BAR");
        });

        it("set many", () => {
            env({
                FOO: "BAR",
                BAR: "BAZ",
            });

            strictEqual(env("FOO"), "BAR");
            strictEqual(env("BAR"), "BAZ");
        });
    });

    it("customInspect", () => {
        class Tuple {
            private _values: any[];

            constructor(...values: any[]) {
                this._values = values;
            }

            [customInspect]() {
                return "(" + this._values.join(", ") + ")";
            }
        }

        if (isNode) {
            strictEqual(util.inspect(new Tuple(1, 2, 3)), "(1, 2, 3)");
        } else if (isDeno) {
            strictEqual(Deno.inspect(new Tuple(1, 2, 3)), "(1, 2, 3)");
        } else if (isBun) {
            strictEqual(Bun.inspect(new Tuple(1, 2, 3)), "(1, 2, 3)");
        }
    });
});
