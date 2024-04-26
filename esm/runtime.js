import { isDeno, isBun, isNode, isBrowser } from './env.js';

/**
 * Utility functions to retrieve runtime information or modify runtime behaviors.
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
function env(name = undefined, value = undefined) {
    var _a, _b;
    if (typeof Deno === "object") {
        if (name === undefined) {
            return Deno.env.toObject();
        }
        else if (value === undefined) {
            return Deno.env.get(name);
        }
        else {
            Deno.env.set(name, value);
        }
    }
    else if (typeof process === "object" && typeof process.env === "object") {
        if (name === undefined) {
            return process.env;
        }
        else if (value === undefined) {
            return process.env[name];
        }
        else {
            process.env[name] = value;
        }
    }
    else {
        // @ts-ignore
        const env = globalThis["__env__"];
        // @ts-ignore
        if (env === undefined || env === null || typeof env === "object") {
            if (name === undefined) {
                return env !== null && env !== void 0 ? env : {};
            }
            else if (value === undefined) {
                return (_a = env === null || env === void 0 ? void 0 : env[name]) !== null && _a !== void 0 ? _a : undefined;
            }
            // @ts-ignore
            ((_b = globalThis["__env__"]) !== null && _b !== void 0 ? _b : (globalThis["__env__"] = {}))[name] = value;
            return;
        }
        else {
            throw new Error("Unsupported runtime");
        }
    }
}
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
/**
 * Make the timer block the event loop from finishing again after it has been
 * unrefed.
 *
 * Only available in Node.js/Bun and Deno, in the browser, this function is a
 * no-op.
 */
function refTimer(timer) {
    if (typeof timer === "object" && typeof timer.ref === "function") {
        timer.ref();
    }
    else if (typeof timer === "number"
        && typeof Deno === "object"
        && typeof Deno.refTimer === "function") {
        Deno.refTimer(timer);
    }
}
/**
 * Make the timer not block the event loop from finishing.
 *
 * Only available in Node.js/Bun and Deno, in the browser, this function is a
 * no-op.
 */
function unrefTimer(timer) {
    if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
    }
    else if (typeof timer === "number"
        && typeof Deno === "object"
        && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(timer);
    }
}

export { CommonRuntimes, customInspect, runtime as default, env, isREPL, refTimer, unrefTimer };
//# sourceMappingURL=runtime.js.map
