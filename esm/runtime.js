import { isDeno, isBun, isNode, isBrowser } from './env.js';

/**
 * Utility functions to retrieve runtime information of the current program.
 * @module
 */
/**
 * A universal symbol that can be used to customize the inspection behavior of
 * an object, supports Node.js, Bun, Deno and any runtime that has
 * Node.js-compatible `util.inspect` function.
 */
const customInspect = (() => {
    if (isBrowser) {
        return Symbol.for("Symbol.customInspect");
    }
    else if (isDeno) {
        return Symbol.for("Deno.customInspect");
    }
    else {
        return Symbol.for("nodejs.util.inspect.custom");
    }
})();
const CommonRuntimes = [
    "node",
    "deno",
    "bun",
    "chromium",
    "firefox",
    "safari",
];
/**
 * Returns the information of the runtime environment in which the program is
 * running.
 */
function runtime() {
    var _a;
    if (isDeno) {
        return {
            identity: "deno",
            version: Deno.version.deno,
            tsSupport: true,
        };
    }
    else if (isBun) {
        return {
            identity: "bun",
            version: Bun.version,
            tsSupport: true,
        };
    }
    else if (isNode) {
        return {
            identity: "node",
            version: process.version.slice(1),
            tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                || /\.tsx?$|\bvite\b/.test((_a = process.argv[1]) !== null && _a !== void 0 ? _a : "")
        };
    }
    else if (isBrowser) {
        const ua = navigator.userAgent.match(/(Firefox|Edg?e|Safari|Chrom(e|ium))\/(\d+(\.\d+)+)/g);
        if (ua) {
            const list = ua.map(part => {
                const [name, version] = part.split("/");
                return { name, version };
            });
            const safari = list.find(({ name }) => name === "Safari");
            const firefox = list.find(({ name }) => name === "Firefox");
            const chrome = list.find(({ name }) => name === "Chrome" || name === "Chromium");
            if (safari && !chrome && !firefox) {
                return {
                    identity: "safari",
                    version: safari.version,
                    tsSupport: false,
                };
            }
            else if (firefox && !chrome && !safari) {
                return {
                    identity: "firefox",
                    version: firefox.version,
                    tsSupport: false,
                };
            }
            else if (chrome) {
                return {
                    identity: "chromium",
                    version: chrome.version,
                    tsSupport: false,
                };
            }
        }
    }
    return { identity: "others", version: undefined, tsSupport: false };
}
const CommonPlatforms = [
    "darwin",
    "windows",
    "linux",
];
/**
 * Returns a string identifying the operating system platform in which the
 * program is running.
 */
function platform() {
    if (typeof Deno === "object") {
        if (CommonPlatforms.includes(Deno.build.os)) {
            return Deno.build.os;
        }
    }
    else if (typeof process === "object" && typeof process.platform === "string") {
        if (process.platform === "win32") {
            return "windows";
        }
        else if (CommonPlatforms.includes(process.platform)) {
            return process.platform;
        }
    }
    else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        }
        else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        }
        else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        }
    }
    return "others";
}
/**
 * Detects if the program is running in a REPL environment.
 *
 * NOTE: This function currently returns `true` when in:
 * - Node.js REPL
 * - Deno REPL
 * - Bun REPL
 * - Google Chrome Console
 */
function isREPL() {
    return ("_" in globalThis && "_error" in globalThis)
        || ("$0" in globalThis && "$1" in globalThis)
        || (typeof $0 === "object" || typeof $1 === "object");
}

export { CommonPlatforms, CommonRuntimes, customInspect, runtime as default, isREPL, platform };
//# sourceMappingURL=runtime.js.map
