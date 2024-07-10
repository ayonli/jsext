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
declare function WorkerLocation(): void;

export type WellknownRuntimes = "node"
    | "deno"
    | "bun"
    | "workerd"
    | "fastly"
    | "chrome"
    | "firefox"
    | "safari";
export const WellknownRuntimes: WellknownRuntimes[] = [
    "node",
    "deno",
    "bun",
    "workerd",
    "fastly",
    "chrome",
    "firefox",
    "safari",
];

/**
 * The information of the runtime environment in which the program is running.
 */
export interface RuntimeInfo {
    /**
     * The representation term of the runtime.
     */
    type: WellknownRuntimes | "unknown";
    /**
     * @deprecated Use `type` instead, this property will be removed in the next
     * major version.
     */
    identity?: string;
    /**
     * The version of the runtime. This property is `undefined` when `type` is
     * `unknown`.
     */
    version?: string | undefined;
    /**
     * Whether the runtime has file system support. When `true`, the program can
     * use the `@ayonli/jsext/fs` module to access the file system.
     */
    fsSupport: boolean;
    /**
     * Whether the runtime has TypeScript support. When `true`, the program can
     * import TypeScript files directly.
     */
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
 * 
 * @example
 * ```ts
 * import runtime from "@ayonli/jsext/runtime";
 * 
 * console.log(runtime());
 * 
 * // In Node.js
 * // {
 * //     type: "node",
 * //     version: "22.0.0",
 * //     fsSupport: true,
 * //     tsSupport: false,
 * //     worker: undefined
 * // }
 * 
 * // In Deno
 * // {
 * //     type: "deno",
 * //     version: "1.42.0",
 * //     fsSupport: true,
 * //     tsSupport: true,
 * //     worker: undefined
 * // }
 * 
 * // In the browser (Chrome)
 * // {
 * //     type: "chrome",
 * //     version: "125.0.0.0",
 * //     fsSupport: true,
 * //     tsSupport: false,
 * //     worker: undefined
 * // }
 * 
 * // ...
 * ```
 */
export default function runtime(): RuntimeInfo {
    const construct = (info: RuntimeInfo): RuntimeInfo => {
        Object.defineProperty(info, "identity", {
            get() {
                return info.type === "workerd" ? "cloudflare-worker" : info.type;
            },
        });

        return info;
    };

    if (isDeno) {
        return construct({
            type: "deno",
            version: Deno.version.deno,
            fsSupport: true,
            tsSupport: true,
            worker: isMainThread ? undefined : "dedicated",
        });
    } else if (isBun) {
        return construct({
            type: "bun",
            version: Bun.version,
            fsSupport: true,
            tsSupport: true,
            worker: isMainThread ? undefined : "dedicated",
        });
    } else if (isNode) {
        return construct({
            type: "node",
            version: process.version.slice(1),
            fsSupport: true,
            tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                || /\.tsx?$|\bvite\b/.test(process.argv[1] ?? ""),
            worker: isMainThread ? undefined : "dedicated",
        });
    }

    const fsSupport = typeof FileSystemHandle === "function";
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
                return construct({
                    type: "safari",
                    version: safari!.version,
                    fsSupport,
                    tsSupport: false,
                    worker,
                });
            } else if (firefox && !chrome && !safari) {
                return construct({
                    type: "firefox",
                    version: firefox!.version,
                    fsSupport,
                    tsSupport: false,
                    worker,
                });
            } else if (chrome) {
                return construct({
                    type: "chrome",
                    version: chrome!.version,
                    fsSupport,
                    tsSupport: false,
                    worker,
                });
            } else {
                return construct({
                    type: "unknown",
                    version: undefined,
                    fsSupport,
                    tsSupport: false,
                    worker,
                });
            }
        } else if (/Cloudflare[-\s]Workers?/i.test(navigator.userAgent)) {
            return construct({
                type: "workerd",
                version: undefined,
                fsSupport,
                tsSupport: (() => {
                    try {
                        throw new Error("Test error");
                    } catch (err: any) {
                        return /[\\/]\.?wrangler[\\/]/.test(err.stack!);
                    }
                })(),
                worker: "service",
            });
        }
    } else if (typeof WorkerLocation === "function" && globalThis.location instanceof WorkerLocation) {
        return construct({
            type: "fastly",
            version: undefined,
            fsSupport,
            tsSupport: false,
            worker: "service",
        });
    }

    return construct({
        type: "unknown",
        version: undefined,
        fsSupport,
        tsSupport: false,
        worker,
    });
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
        if ((WellknownPlatforms as string[]).includes(Deno.build.os)) {
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

const ENV: { [x: string]: string; } = {};

/** Returns all environment variables in an object. */
export function env(): { [name: string]: string; };
/** Returns a specific environment variable. */
export function env(name: string): string | undefined;
/**
 * Sets the value of a specific environment variable.
 * 
 * @deprecated The program should not try to modify the environment variables,
 * and it's forbidden in worker environments.
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
    } else if (runtime().type === "workerd") {
        if (typeof name === "object" && name !== null) {
            for (const [key, val] of Object.entries(name)) {
                if (["string", "number", "boolean"].includes(typeof val)) {
                    ENV[key] = String(val);
                }
            }
        } else if (name === undefined) {
            if (Object.keys(ENV).length) {
                return ENV;
            } else {
                const keys = Object.keys(globalThis).filter(key => {
                    return /^[A-Z][A-Z0-9_]*$/.test(key)
                        // @ts-ignore
                        && ["string", "number", "boolean"].includes(typeof globalThis[key]);
                });
                return keys.reduce((record, key) => {
                    // @ts-ignore
                    record[key] = String(globalThis[key]);
                    return record;
                }, {});
            }
        } else if (value === undefined) {
            if (ENV[name] !== undefined) {
                return ENV[name];
            } else {
                // @ts-ignore
                const value = globalThis[name];

                if (["string", "number", "boolean"].includes(typeof value)) {
                    return String(value);
                } else {
                    return undefined;
                }
            }
        } else {
            throw new Error("Cannot modify environment variables in the worker");
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
        } else if (typeof name === "object" && name !== null) {
            for (const [key, val] of Object.entries(name)) {
                ENV[key] = String(val);
            }
        } else if (name === undefined) {
            return ENV;
        } else if (value === undefined) {
            return ENV[name];
        } else {
            env[name] = String(value);
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
 * 
 * @example
 * ```ts
 * import { unrefTimer } from "@ayonli/jsext/runtime";
 * 
 * const timer = setTimeout(() => {
 *     console.log("Hello, World!");
 * }, 1000);
 * 
 * unrefTimer(timer);
 * ```
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
 * 
 * @example
 * ```ts
 * import { addShutdownListener } from "@ayonli/jsext/runtime";
 * import * as http from "node:http";
 * 
 * const server = http.createServer((req, res) => {
 *     res.end("Hello, World!");
 * });
 * 
 * server.listen(3000);
 * 
 * addShutdownListener(async () => {
 *     await new Promise<void>((resolve) => {
 *         server.close(resolve);
 *     });
 * });
 * ```
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
 * A unified symbol that can be used to customize the inspection behavior of an
 * object, currently supports Node.js, Bun and Deno.
 * 
 * @example
 * ```ts
 * import { customInspect } from "@ayonli/jsext/runtime";
 * 
 * class Point {
 *     constructor(public x: number, public y: number) {}
 * 
 *    [customInspect]() {
 *        return `Point (${this.x}, ${this.y})`;
 *    }
 * }
 * 
 * console.log(new Point(1, 2)); // Point (1, 2)
 * ```
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
