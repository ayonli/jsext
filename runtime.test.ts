import { deepStrictEqual, strictEqual } from "node:assert";
import * as util from "node:util";
import runtime, { env, customInspect } from "./runtime.ts";
import { isBun, isDeno, isNode } from "./env.ts";

declare const Bun: any;

describe("runtime", () => {
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
});
