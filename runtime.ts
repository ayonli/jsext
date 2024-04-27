/**
 * Utility functions to retrieve runtime information or modify runtime behaviors.
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
export function env(name: string | undefined = undefined, value: string | undefined = undefined): any {
    if (typeof Deno === "object") {
        if (name === undefined) {
            return Deno.env.toObject();
        } else if (value === undefined) {
            return Deno.env.get(name);
        } else {
            Deno.env.set(name, String(value));
        }
    } else if (typeof process === "object" && typeof process.env === "object") {
        if (name === undefined) {
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
            if (name === undefined) {
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
