/**
 * Utility functions to retrieve runtime information of the current program.
 * @module
 */

import { isBrowser, isBun, isDeno, isNode } from "./env.ts";

declare const Bun: any;

/**
 * Special runtimes:
 * 
 * - `chromium` - Google Chrome and other Chromium-based browsers, this includes the
 *  new Microsoft Edge.
 * - `edge` - Legacy Microsoft Edge.
 */
export type CommonRuntimes = "node" | "deno" | "bun" | "chromium" | "firefox" | "safari" | "edge";
export const CommonRuntimes: CommonRuntimes[] = [
    "node",
    "deno",
    "bun",
    "chromium",
    "firefox",
    "safari",
    "edge",
];

export type RuntimeInfo = {
    /** The representation name of the runtime. */
    identity: CommonRuntimes | "others";
    /**
     * The version of the runtime. This property is `undefined` when `identity` is `others`.
     */
    version: string | undefined;
    /**
     * The JavaScript engine used by the runtime. This property is `"others"` when `identity` is
     * `others`.
     */
    engine: "V8" | "SpiderMonkey" | "JavaScriptCore" | "Chakra" | "others";
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
            engine: "V8",
            tsSupport: true,
        };
    } else if (isBun) {
        return {
            identity: "bun",
            version: Bun.version,
            engine: "JavaScriptCore",
            tsSupport: true,
        };
    } else if (isNode) {
        return {
            identity: "node",
            version: process.version.slice(1),
            engine: "V8",
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
            const edge = list.find(({ name }) => name === "Edge" || name === "Edg");
            const chrome = list.find(({ name }) => name === "Chrome" || name === "Chromium");

            if (safari && !chrome && !firefox && !edge) {
                return {
                    identity: "safari",
                    version: safari!.version,
                    engine: "JavaScriptCore",
                    tsSupport: false,
                };
            } else if (firefox && !chrome && !safari && !edge) {
                return {
                    identity: "firefox",
                    version: firefox!.version,
                    engine: "SpiderMonkey",
                    tsSupport: false,
                };
            } else if (edge && !chrome && !safari && !firefox) {
                return {
                    identity: "edge",
                    version: edge!.version,
                    engine: "Chakra",
                    tsSupport: false,
                };
            } else if (chrome) {
                return {
                    identity: "chromium",
                    version: chrome!.version,
                    engine: "V8",
                    tsSupport: false,
                };
            }
        }
    }

    return { identity: "others", version: undefined, engine: "others", tsSupport: false };
}

export type CommonPlatforms = "android"
    | "darwin"
    | "freebsd"
    | "linux"
    | "windows";
export const CommonPlatforms: CommonPlatforms[] = [
    "android",
    "darwin",
    "freebsd",
    "linux",
    "windows",
];

/**
 * Returns a string identifying the operating system platform in which the
 * program is running.
 */
export function platform(): CommonPlatforms | "others" {
    if (typeof Deno === "object") {
        if (CommonPlatforms.includes(Deno.build.os as any)) {
            return Deno.build.os as CommonPlatforms;
        } else {
            return "others";
        }
    } else if (typeof process === "object" && typeof process.platform === "string") {
        if (process.platform === "win32") {
            return "windows";
        } else if ((CommonPlatforms as string[]).includes(process.platform)) {
            return process.platform as CommonPlatforms;
        } else {
            return "others";
        }
    } else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Android")) {
            return "android";
        } else if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        } else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        } else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        } else {
            return "others";
        }
    } else {
        return "others";
    }
}
