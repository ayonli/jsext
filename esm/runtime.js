import { isDeno, isMainThread, isBun, isNode, isSharedWorker, isServiceWorker, isDedicatedWorker, isNodeLike } from './env.js';

/**
 * Utility functions to retrieve runtime information or modify runtime behaviors.
 * @module
 */
const CommonRuntimes = [
    "node",
    "deno",
    "bun",
    "chromium",
    "firefox",
    "safari",
    "cloudflare-worker",
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
            worker: isMainThread ? undefined : "dedicated",
        };
    }
    else if (isBun) {
        return {
            identity: "bun",
            version: Bun.version,
            tsSupport: true,
            worker: isMainThread ? undefined : "dedicated",
        };
    }
    else if (isNode) {
        return {
            identity: "node",
            version: process.version.slice(1),
            tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                || /\.tsx?$|\bvite\b/.test((_a = process.argv[1]) !== null && _a !== void 0 ? _a : ""),
            worker: isMainThread ? undefined : "dedicated",
        };
    }
    else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        const ua = navigator.userAgent.match(/(Firefox|Edg?e|Safari|Chrom(e|ium))\/(\d+(\.\d+)+)/g);
        if (ua) {
            const list = ua.map(part => {
                const [name, version] = part.split("/");
                return { name, version };
            });
            const safari = list.find(({ name }) => name === "Safari");
            const firefox = list.find(({ name }) => name === "Firefox");
            const chrome = list.find(({ name }) => name === "Chrome" || name === "Chromium");
            const worker = isSharedWorker ? "shared"
                : isServiceWorker ? "service"
                    : isDedicatedWorker ? "dedicated"
                        : undefined;
            if (safari && !chrome && !firefox) {
                return {
                    identity: "safari",
                    version: safari.version,
                    tsSupport: false,
                    worker,
                };
            }
            else if (firefox && !chrome && !safari) {
                return {
                    identity: "firefox",
                    version: firefox.version,
                    tsSupport: false,
                    worker,
                };
            }
            else if (chrome) {
                return {
                    identity: "chromium",
                    version: chrome.version,
                    tsSupport: false,
                    worker,
                };
            }
            else {
                return {
                    identity: "others",
                    version: undefined,
                    tsSupport: false,
                    worker,
                };
            }
        }
        else if (/Cloudflare[-\s]Workers?/i.test(navigator.userAgent)) {
            return {
                identity: "cloudflare-worker",
                version: undefined,
                tsSupport: false,
                worker: "service",
            };
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
    if (isDeno) {
        if (CommonPlatforms.includes(Deno.build.os)) {
            return Deno.build.os;
        }
    }
    else if (isNodeLike) {
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
function env(name = undefined, value = undefined) {
    var _a, _b;
    if (isDeno) {
        if (typeof name === "object" && name !== null) {
            for (const [key, val] of Object.entries(name)) {
                Deno.env.set(key, String(val));
            }
        }
        else if (name === undefined) {
            return Deno.env.toObject();
        }
        else if (value === undefined) {
            return Deno.env.get(name);
        }
        else {
            Deno.env.set(name, String(value));
        }
    }
    else if (typeof process === "object" // Check process.env instead of isNodeLike for
        && typeof (process === null || process === void 0 ? void 0 : process.env) === "object" // broader adoption.
    ) {
        if (typeof name === "object" && name !== null) {
            for (const [key, val] of Object.entries(name)) {
                process.env[key] = String(val);
            }
        }
        else if (name === undefined) {
            return process.env;
        }
        else if (value === undefined) {
            return process.env[name];
        }
        else {
            process.env[name] = String(value);
        }
    }
    else {
        // @ts-ignore
        const env = globalThis["__env__"];
        // @ts-ignore
        if (env === undefined || env === null || typeof env === "object") {
            if (typeof name === "object" && name !== null) {
                for (const [key, val] of Object.entries(name)) {
                    // @ts-ignore
                    ((_a = globalThis["__env__"]) !== null && _a !== void 0 ? _a : (globalThis["__env__"] = {}))[key] = String(val);
                }
            }
            else if (name === undefined) {
                return env !== null && env !== void 0 ? env : {};
            }
            else if (value === undefined) {
                return (env === null || env === void 0 ? void 0 : env[name]) ? String(env[name]) : undefined;
            }
            else {
                // @ts-ignore
                ((_b = globalThis["__env__"]) !== null && _b !== void 0 ? _b : (globalThis["__env__"] = {}))[name] = String(value);
            }
        }
        else {
            throw new Error("Unsupported runtime");
        }
    }
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
const shutdownListeners = [];
let shutdownListenerRegistered = false;
/**
 * Adds a listener function to be called when the program receives a `SIGINT`
 * (`Ctrl+C`) signal, or a `shutdown` message sent by the parent process (a
 * **PM2** pattern for Windows), so that the program can perform a graceful
 * shutdown.
 *
 * This function can be called multiple times to register multiple listeners,
 * they will be executed in the order they were added, and any asynchronous
 * listener will be awaited before the next listener is executed.
 *
 * Inside the listener, there is no need to call `process.exit` or `Deno.exit`,
 * the program will exit automatically after all listeners are executed in order.
 * In fact, calling the `exit` method in a listener is problematic and will
 * cause any subsequent listeners not to be executed.
 *
 * In the browser or unsupported environments, this function is a no-op.
 */
function addShutdownListener(fn) {
    if (!isDeno && !isNodeLike) {
        return;
    }
    shutdownListeners.push(fn);
    if (!shutdownListenerRegistered) {
        shutdownListenerRegistered = true;
        const shutdownListener = async () => {
            try {
                for (const listener of shutdownListeners) {
                    await listener();
                }
                if (isDeno) {
                    Deno.exit(0);
                }
                else {
                    process.exit(0);
                }
            }
            catch (err) {
                console.error(err);
                if (isDeno) {
                    Deno.exit(1);
                }
                else {
                    process.exit(1);
                }
            }
        };
        if (isDeno) {
            Deno.addSignalListener("SIGINT", shutdownListener);
        }
        else {
            process.on("SIGINT", shutdownListener);
            if (platform() === "windows") {
                process.on("message", message => {
                    if (message === "shutdown") {
                        shutdownListener();
                    }
                });
            }
        }
    }
}
/**
 * A universal symbol that can be used to customize the inspection behavior of
 * an object, currently supports Node.js, Bun and Deno.
 */
const customInspect = (() => {
    if (isDeno) {
        return Symbol.for("Deno.customInspect");
    }
    else if (isNodeLike) {
        return Symbol.for("nodejs.util.inspect.custom");
    }
    else {
        return Symbol.for("Symbol.customInspect");
    }
})();

export { CommonPlatforms, CommonRuntimes, addShutdownListener, customInspect, runtime as default, env, isREPL, platform, refTimer, unrefTimer };
//# sourceMappingURL=runtime.js.map
