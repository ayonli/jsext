/**
 * Utility functions to retrieve runtime information of the current program.
 * @module
 */

import { isBrowser, isBun, isDeno, isNode } from "./env.ts";

declare const Bun: any;

/**
 * A universal symbol that can be used to customize the inspection behavior of
 * an object, supports Node.js, Bun, Deno and any runtime that has
 * Node.js-compatible `util.inspect` function.
 */
export const customInspect: unique symbol = (() => {
    if (isBrowser) {
        return Symbol.for("Symbol.customInspect");
    } else if (isDeno) {
        return Symbol.for("Deno.customInspect");
    } else {
        return Symbol.for("nodejs.util.inspect.custom");
    }
})() as any;

/**
 * Special runtimes:
 * 
 * - `chromium` - Google Chrome and other Chromium-based browsers, this includes the
 *  new Microsoft Edge.
 * - `edge` - Legacy Microsoft Edge.
 */
export type CommonRuntimes = "node" | "deno" | "bun" | "chromium" | "firefox" | "safari";
export const CommonRuntimes: CommonRuntimes[] = [
    "node",
    "deno",
    "bun",
    "chromium",
    "firefox",
    "safari",
];

export type RuntimeInfo = {
    /** The representation term of the runtime. */
    identity: CommonRuntimes | "others";
    /**
     * The version of the runtime. This property is `undefined` when `identity` is `others`.
     */
    version: string | undefined;
    /** Whether the runtime supports TypeScript. */
    tsSupport: boolean;
};

/**
 * Returns the information of the runtime environment in which the program is
 * running.
 */
export default function runtime(): RuntimeInfo {
    if (isDeno) {
        return {
            identity: "deno",
            version: Deno.version.deno,
            tsSupport: true,
        };
    } else if (isBun) {
        return {
            identity: "bun",
            version: Bun.version,
            tsSupport: true,
        };
    } else if (isNode) {
        return {
            identity: "node",
            version: process.version.slice(1),
            tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                || /\.tsx?$|\bvite\b/.test(process.argv[1] ?? "")
        };
    } else if (isBrowser) {
        const ua = navigator.userAgent.match(/(Firefox|Edg?e|Safari|Chrom(e|ium))\/(\d+(\.\d+)+)/g);

        if (ua) {
            const list = ua.map(part => {
                const [name, version] = part.split("/") as string[];
                return { name, version };
            });
            const safari = list.find(({ name }) => name === "Safari");
            const firefox = list.find(({ name }) => name === "Firefox");
            const chrome = list.find(({ name }) => name === "Chrome" || name === "Chromium");

            if (safari && !chrome && !firefox) {
                return {
                    identity: "safari",
                    version: safari!.version,
                    tsSupport: false,
                };
            } else if (firefox && !chrome && !safari) {
                return {
                    identity: "firefox",
                    version: firefox!.version,
                    tsSupport: false,
                };
            } else if (chrome) {
                return {
                    identity: "chromium",
                    version: chrome!.version,
                    tsSupport: false,
                };
            }
        }
    }

    return { identity: "others", version: undefined, tsSupport: false };
}

export type CommonPlatforms = "darwin"
    | "windows"
    | "linux";
export const CommonPlatforms: CommonPlatforms[] = [
    "darwin",
    "windows",
    "linux",
];

/**
 * Returns a string identifying the operating system platform in which the
 * program is running.
 */
export function platform(): CommonPlatforms | "others" {
    if (typeof Deno === "object") {
        if (CommonPlatforms.includes(Deno.build.os as any)) {
            return Deno.build.os as CommonPlatforms;
        }
    } else if (typeof process === "object" && typeof process.platform === "string") {
        if (process.platform === "win32") {
            return "windows";
        } else if ((CommonPlatforms as string[]).includes(process.platform)) {
            return process.platform as CommonPlatforms;
        }
    } else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        } else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        } else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        }
    }

    return "others";
}

declare let $0: unknown;
declare let $1: unknown;

/**
 * Detects if the program is running in a REPL environment.
 *
 * NOTE: This function currently returns `true` when in:
 * - Node.js REPL
 * - Deno REPL
 * - Bun REPL
 * - Google Chrome Console
 */
export function isREPL() {
    return ("_" in globalThis && "_error" in globalThis)
        || ("$0" in globalThis && "$1" in globalThis)
        || (typeof $0 === "object" || typeof $1 === "object");
}
