/**
 * Utility functions to retrieve runtime information or configure runtime behaviors.
 * @module
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
import { NotSupportedError } from "./error.ts";
import { createCloseEvent } from "./event.ts";
import { parseUserAgent } from "./http/user-agent.ts";

declare function WorkerLocation(): void;

export type WellknownRuntime = "node"
    | "deno"
    | "bun"
    | "workerd"
    | "fastly"
    | "chrome"
    | "firefox"
    | "safari";

/**
 * The information of the runtime environment in which the program is running.
 */
export interface RuntimeInfo {
    /**
     * A string identifying the runtime.
     */
    identity: WellknownRuntime | "unknown";
    /**
     * The version of the runtime. This property may be `undefined` if the
     * runtime doesn't provide version information, or when the runtime is
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
 * //     identity: "node",
 * //     version: "22.0.0",
 * //     fsSupport: true,
 * //     tsSupport: false,
 * //     worker: undefined
 * // }
 * 
 * // In Deno
 * // {
 * //     identity: "deno",
 * //     version: "1.42.0",
 * //     fsSupport: true,
 * //     tsSupport: true,
 * //     worker: undefined
 * // }
 * 
 * // In the browser (Chrome)
 * // {
 * //     identity: "chrome",
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
    if (isDeno) {
        return {
            identity: "deno",
            version: Deno.version.deno,
            fsSupport: true,
            tsSupport: true,
            worker: isMainThread ? undefined : "dedicated",
        };
    } else if (isBun) {
        return {
            identity: "bun",
            version: Bun.version,
            fsSupport: true,
            tsSupport: true,
            worker: isMainThread ? undefined : "dedicated",
        };
    } else if (isNode) {
        return {
            identity: "node",
            version: process.version.slice(1),
            fsSupport: true,
            tsSupport: process.execArgv.some(arg => /\b(tsx|ts-node|vite|swc-node|tsimp)\b/.test(arg))
                || /\.tsx?$|\bvite\b/.test(process.argv[1] ?? ""),
            worker: isMainThread ? undefined : "dedicated",
        };
    }

    const fsSupport = typeof FileSystemHandle === "function";
    const worker = isSharedWorker ? "shared"
        : isServiceWorker ? "service"
            : isDedicatedWorker ? "dedicated"
                : undefined;

    if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        const ua = parseUserAgent(navigator.userAgent);

        if (ua.runtime) {
            const { identity, version } = ua.runtime;

            if (identity === "workerd") {
                return {
                    identity,
                    version,
                    fsSupport,
                    tsSupport: (() => {
                        try {
                            throw new Error("Test error");
                        } catch (err: any) {
                            return /[\\/]\.?wrangler[\\/]/.test(err.stack!);
                        }
                    })(),
                    worker: "service",
                };
            } else {
                return {
                    identity,
                    version,
                    fsSupport,
                    tsSupport: false,
                    worker,
                };
            }
        } else {
            return {
                identity: "unknown",
                version: undefined,
                fsSupport,
                tsSupport: false,
                worker,
            };
        }
    } else if (typeof WorkerLocation === "function" && globalThis.location instanceof WorkerLocation) {
        return {
            identity: "fastly",
            version: undefined,
            fsSupport,
            tsSupport: false,
            worker: "service",
        };
    }

    return {
        identity: "unknown",
        version: undefined,
        fsSupport,
        tsSupport: false,
        worker,
    };
}

export type WellknownPlatform = "darwin"
    | "windows"
    | "linux"
    | "android"
    | "freebsd"
    | "openbsd"
    | "netbsd"
    | "aix"
    | "solaris";

const WellknownPlatforms: WellknownPlatform[] = [
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
export function platform(): WellknownPlatform | "unknown" {
    if (isDeno) {
        if ((WellknownPlatforms as string[]).includes(Deno.build.os)) {
            return Deno.build.os as WellknownPlatform;
        }
    } else if (isNodeLike) {
        if (process.platform === "win32") {
            return "windows";
        } else if (process.platform === "sunos") {
            return "solaris";
        } else if ((WellknownPlatforms as string[]).includes(process.platform)) {
            return process.platform as WellknownPlatform;
        }
    } else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        return parseUserAgent(navigator.userAgent).platform;
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
    } else if (runtime().identity === "workerd") {
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
            throw new NotSupportedError("Cannot modify environment variables in the worker.");
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
 * NOTE: This function is only available in Node.js, Deno and Bun, in other
 * environments, it's a no-op.
 */
export function refTimer(timer: NodeJS.Timeout | number): void {
    if (typeof timer === "object" && typeof timer.ref === "function") {
        timer.ref();
    } else if (typeof timer === "number" && isDeno) {
        Deno.refTimer(timer);
    }
}

/**
 * Make the timer not block the event loop from finishing.
 * 
 * NOTE: This function is only available in Node.js, Deno and Bun, in other
 * environments, it's a no-op.
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
    } else if (typeof timer === "number" && isDeno) {
        Deno.unrefTimer(timer);
    }
}

const shutdownListeners: ((event: CloseEvent) => void | Promise<void>)[] = [];

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
 * The listener function receives a {@link CloseEvent}, if we don't what the program
 * to exit, we can call `event.preventDefault()` to prevent from exiting.
 * 
 * In the browser or unsupported environments, this function is a no-op.
 * 
 * @example
 * ```ts
 * import { addShutdownListener } from "@ayonli/jsext/runtime";
 * import { serve } from "@ayonli/jsext/http";
 * 
 * const server = serve({
 *     fetch(req) {
 *         return new Response("Hello, World!");
 *     }
 * });
 * 
 * addShutdownListener(async () => {
 *     await server.close();
 * });
 * ```
 */
export function addShutdownListener(fn: (event: CloseEvent) => void | Promise<void>): void {
    if (!isDeno && !isNodeLike) {
        return;
    }

    if (shutdownListeners.length) {
        shutdownListeners.push(fn);
        return;
    }

    shutdownListeners.push(fn);

    const shutdownListener = async () => {
        try {
            const event = createCloseEvent("shutdown", {
                cancelable: true,
                code: 0,
                reason: "The program is interrupted.",
                wasClean: true,
            });

            Object.defineProperties(event, {
                target: { configurable: true, value: globalThis },
                currentTarget: { configurable: true, value: globalThis },
            });

            for (const listener of shutdownListeners) {
                await listener(event);
            }

            if (!event.defaultPrevented) {
                if (isDeno) {
                    Deno.exit(0);
                } else {
                    process.exit(0);
                }
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

const rejectionListeners: ((event: PromiseRejectionEvent) => void)[] = [];

/**
 * Adds a listener function to be called when an unhandled promise rejection
 * occurs in the program, this function calls
 * `addEventListener("unhandledrejection")` or `process.on("unhandledRejection")`
 * under the hood.
 * 
 * The purpose of this function is to provide a unified way to handle unhandled
 * promise rejections in different environments, and when possible, provide a
 * consistent behavior of the program when an unhandled rejection occurs.
 * 
 * By default, when an unhandled rejection occurs, the program will log the
 * error to the console (and exit with a non-zero code in Node.js, Deno and Bun),
 * but this behavior can be customized by calling `event.preventDefault()` in
 * the listener function.
 * 
 * In unsupported environments, this function is a no-op.
 * 
 * @example
 * ```ts
 * import { addUnhandledRejectionListener } from "@ayonli/jsext/runtime";
 * 
 * addUnhandledRejectionListener((event) => {
 *     console.error(event.reason);
 *     event.preventDefault(); // Prevent default logging and exiting behavior
 * });
 * ```
 */
export function addUnhandledRejectionListener(fn: (event: PromiseRejectionEvent) => void) {
    const _runtime = runtime().identity;

    const fireEvent = (reason: unknown, promise: Promise<unknown>) => {
        const event = new Event("unhandledrejection", {
            cancelable: true,
        });

        Object.defineProperties(event, {
            reason: { configurable: true, value: reason },
            promise: { configurable: true, value: promise },
            target: { configurable: true, value: globalThis },
            currentTarget: { configurable: true, value: globalThis },
        });

        rejectionListeners.forEach((listener) => {
            listener.call(globalThis, event as PromiseRejectionEvent);
        });

        return event as PromiseRejectionEvent;
    };

    if (_runtime === "node" || _runtime === "bun") {
        if (rejectionListeners.length) {
            rejectionListeners.push(fn);
            return;
        }

        rejectionListeners.push(fn);

        process.on("unhandledRejection", (reason, promise) => {
            const event = fireEvent(reason, promise);

            if (!event.defaultPrevented) {
                if (_runtime === "node") {
                    console.error("\x1b[1m\x1b[31merror\x1b[0m: Uncaught (in promise)", reason);
                } else {
                    console.error("Uncaught (in promise)", reason);
                }

                process.exit(1);
            }
        });
    } else if (_runtime === "workerd") {
        if (rejectionListeners.length) {
            rejectionListeners.push(fn);
            return;
        }

        rejectionListeners.push(fn);

        addEventListener("unhandledrejection", (event) => {
            // The `PromiseRejectionEvent` in Cloudflare Workers is incomplete,
            // so we need to create a workaround to make it work.
            event = fireEvent(event.reason, event.promise);

            if (!event.defaultPrevented) {
                console.error("Uncaught (in promise)", event.reason);
            }
        });
    } else if (typeof addEventListener === "function"
        && _runtime !== "fastly" // Fastly Compute doesn't support `unhandledrejection` event
        && _runtime !== "unknown" // Unknown environment, don't know if it supports `unhandledrejection`
    ) {
        addEventListener("unhandledrejection", fn);
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
