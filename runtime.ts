/**
 * Utility functions to retrieve runtime information or modify runtime behaviors.
 * @module
 * @experimental
 */

import {
    isBun,
    isDeno,
    isNode,
    isMainThread,
    isServiceWorker,
    isSharedWorker,
    isDedicatedWorker,
    isNodeLike,
} from "./env.ts";

declare const Bun: any;

export type WellknownRuntimes = "node"
    | "deno"
    | "bun"
    | "chrome"
    | "firefox"
    | "safari"
    | "cloudflare-worker";
export const WellknownRuntimes: WellknownRuntimes[] = [
    "node",
    "deno",
    "bun",
    "chrome",
    "firefox",
    "safari",
    "cloudflare-worker",
];

export type RuntimeInfo = {
    /** The representation term of the runtime. */
    identity: WellknownRuntimes | "unknown";
    /**
     * The version of the runtime. This property is `undefined` when `identity` is `others`.
     */
    version?: string | undefined;
    /** Whether the runtime supports TypeScript. */
    tsSupport: boolean;
    /**
     * If the program is running in a worker thread, this property indicates the
     * type of the worker.
     */
    worker?: "dedicated" | "shared" | "service" | undefined;
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
            worker: isMainThread ? undefined : "dedicated",
        };
    } else if (isBun) {
        return {
            identity: "bun",
            version: Bun.version,
            tsSupport: true,
            worker: isMainThread ? undefined : "dedicated",
        };
    } else if (isNode) {
        return {
            identity: "node",
            version: process.version.slice(1),
            tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                || /\.tsx?$|\bvite\b/.test(process.argv[1] ?? ""),
            worker: isMainThread ? undefined : "dedicated",
        };
    }

    const worker = isSharedWorker ? "shared"
        : isServiceWorker ? "service"
            : isDedicatedWorker ? "dedicated"
                : undefined;

    if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
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
                    worker,
                };
            } else if (firefox && !chrome && !safari) {
                return {
                    identity: "firefox",
                    version: firefox!.version,
                    tsSupport: false,
                    worker,
                };
            } else if (chrome) {
                return {
                    identity: "chrome",
                    version: chrome!.version,
                    tsSupport: false,
                    worker,
                };
            } else {
                return {
                    identity: "unknown",
                    version: undefined,
                    tsSupport: false,
                    worker,
                };
            }
        } else if (/Cloudflare[-\s]Workers?/i.test(navigator.userAgent)) {
            return {
                identity: "cloudflare-worker",
                version: undefined,
                tsSupport: (() => {
                    try {
                        throw new Error("Test error");
                    } catch (err: any) {
                        return /[\\/]\.?wrangler[\\/]/.test(err.stack!);
                    }
                })(),
                worker,
            };
        }
    }

    return { identity: "unknown", version: undefined, tsSupport: false, worker };
}

export type WellknownPlatforms = "darwin"
    | "windows"
    | "linux"
    | "android"
    | "freebsd"
    | "openbsd"
    | "netbsd"
    | "aix"
    | "solaris";
export const WellknownPlatforms: WellknownPlatforms[] = [
    "darwin",
    "windows",
    "linux",
    "android",
    "freebsd",
    "openbsd",
    "netbsd",
    "aix",
    "solaris",
];

/**
 * Returns a string identifying the operating system platform in which the
 * program is running.
 */
export function platform(): WellknownPlatforms | "unknown" {
    if (isDeno) {
        if (WellknownPlatforms.includes(Deno.build.os as any)) {
            return Deno.build.os as WellknownPlatforms;
        }
    } else if (isNodeLike) {
        if (process.platform === "win32") {
            return "windows";
        } else if (process.platform === "sunos") {
            return "solaris";
        } else if ((WellknownPlatforms as string[]).includes(process.platform)) {
            return process.platform as WellknownPlatforms;
        }
    } else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        } else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        } else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        } else if (navigator.userAgent.includes("Android")) {
            return "android";
        } else if (navigator.userAgent.includes("FreeBSD")) {
            return "freebsd";
        } else if (navigator.userAgent.includes("OpenBSD")) {
            return "openbsd";
        } else if (navigator.userAgent.includes("NetBSD")) {
            return "netbsd";
        } else if (navigator.userAgent.includes("AIX")) {
            return "aix";
        } else if (navigator.userAgent.match(/SunOS|Solaris/)) {
            return "solaris";
        }
    }

    return "unknown";
}

/** Returns all environment variables in an object. */
export function env(): { [name: string]: string; };
/** Returns a specific environment variable. */
export function env(name: string): string | undefined;
/**
 * Sets the value of a specific environment variable.
 * 
 * NOTE: this is a temporary change and will not persist when the program exits.
 */
export function env(name: string, value: string): undefined;
/**
 * Sets the values of multiple environment variables, could be used to load
 * environment variables where there is no native support, e.g the browser or
 * Cloudflare Workers.
 */
export function env(obj: object): void;
export function env(
    name: string | undefined | object = undefined,
    value: string | undefined = undefined
): any {
    if (isDeno) {
        if (typeof name === "object" && name !== null) {
            for (const [key, val] of Object.entries(name)) {
                Deno.env.set(key, String(val));
            }
        } else if (name === undefined) {
            return Deno.env.toObject();
        } else if (value === undefined) {
            return Deno.env.get(name);
        } else {
            Deno.env.set(name, String(value));
        }
    } else if (typeof process === "object"  // Check process.env instead of isNodeLike for
        && typeof process?.env === "object" // broader adoption.
    ) {
        if (typeof name === "object" && name !== null) {
            for (const [key, val] of Object.entries(name)) {
                process.env[key] = String(val);
            }
        } else if (name === undefined) {
            return process.env;
        } else if (value === undefined) {
            return process.env[name];
        } else {
            process.env[name] = String(value);
        }
    } else {
        // @ts-ignore
        const env = globalThis["__env__"] as any;

        // @ts-ignore
        if (env === undefined || env === null || typeof env === "object") {
            if (typeof name === "object" && name !== null) {
                for (const [key, val] of Object.entries(name)) {
                    // @ts-ignore
                    (globalThis["__env__"] ??= {})[key] = String(val);
                }
            } else if (name === undefined) {
                return env ?? {};
            } else if (value === undefined) {
                return env?.[name] ? String(env[name]) : undefined;
            } else {
                // @ts-ignore
                (globalThis["__env__"] ??= {})[name] = String(value);
            }
        } else {
            throw new Error("Unsupported runtime");
        }
    }
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
export function isREPL(): boolean {
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
export function refTimer(timer: NodeJS.Timeout | number): void {
    if (typeof timer === "object" && typeof timer.ref === "function") {
        timer.ref();
    } else if (typeof timer === "number"
        && typeof Deno === "object"
        && typeof Deno.refTimer === "function"
    ) {
        Deno.refTimer(timer);
    }
}

/**
 * Make the timer not block the event loop from finishing.
 * 
 * Only available in Node.js/Bun and Deno, in the browser, this function is a
 * no-op.
 */
export function unrefTimer(timer: NodeJS.Timeout | number): void {
    if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
    } else if (typeof timer === "number"
        && typeof Deno === "object"
        && typeof Deno.unrefTimer === "function"
    ) {
        Deno.unrefTimer(timer);
    }
}

const shutdownListeners: (() => (void | Promise<void>))[] = [];
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
export function addShutdownListener(fn: () => (void | Promise<void>)): void {
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
                } else {
                    process.exit(0);
                }
            } catch (err) {
                console.error(err);

                if (isDeno) {
                    Deno.exit(1);
                } else {
                    process.exit(1);
                }
            }
        };

        if (isDeno) {
            Deno.addSignalListener("SIGINT", shutdownListener);
        } else {
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
export const customInspect: unique symbol = (() => {
    if (isDeno) {
        return Symbol.for("Deno.customInspect");
    } else if (isNodeLike) {
        return Symbol.for("nodejs.util.inspect.custom");
    } else {
        return Symbol.for("Symbol.customInspect");
    }
})() as any;
