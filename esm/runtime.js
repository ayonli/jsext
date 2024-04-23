import { isDeno, isBun, isNode, isBrowser } from './env.js';

/**
 * Utility functions to retrieve runtime information of the current program.
 * @module
 */
const CommonRuntimes = [
    "node",
    "deno",
    "bun",
    "chromium",
    "firefox",
    "safari",
    "edge",
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
            engine: "V8",
            tsSupport: true,
        };
    }
    else if (isBun) {
        return {
            identity: "bun",
            version: Bun.version,
            engine: "JavaScriptCore",
            tsSupport: true,
        };
    }
    else if (isNode) {
        return {
            identity: "node",
            version: process.version.slice(1),
            engine: "V8",
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
            const edge = list.find(({ name }) => name === "Edge" || name === "Edg");
            const chrome = list.find(({ name }) => name === "Chrome" || name === "Chromium");
            if (safari && !chrome && !firefox && !edge) {
                return {
                    identity: "safari",
                    version: safari.version,
                    engine: "JavaScriptCore",
                    tsSupport: false,
                };
            }
            else if (firefox && !chrome && !safari && !edge) {
                return {
                    identity: "firefox",
                    version: firefox.version,
                    engine: "SpiderMonkey",
                    tsSupport: false,
                };
            }
            else if (edge && !chrome && !safari && !firefox) {
                return {
                    identity: "edge",
                    version: edge.version,
                    engine: "Chakra",
                    tsSupport: false,
                };
            }
            else if (chrome) {
                return {
                    identity: "chromium",
                    version: chrome.version,
                    engine: "V8",
                    tsSupport: false,
                };
            }
        }
    }
    return { identity: "others", version: undefined, engine: "others", tsSupport: false };
}
const CommonPlatforms = [
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
function platform() {
    if (typeof Deno === "object") {
        if (CommonPlatforms.includes(Deno.build.os)) {
            return Deno.build.os;
        }
        else {
            return "others";
        }
    }
    else if (typeof process === "object" && typeof process.platform === "string") {
        if (process.platform === "win32") {
            return "windows";
        }
        else if (CommonPlatforms.includes(process.platform)) {
            return process.platform;
        }
        else {
            return "others";
        }
    }
    else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Android")) {
            return "android";
        }
        else if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        }
        else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        }
        else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        }
        else {
            return "others";
        }
    }
    else {
        return "others";
    }
}

export { CommonPlatforms, CommonRuntimes, runtime as default, platform };
//# sourceMappingURL=runtime.js.map
