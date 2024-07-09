// @ts-ignore
import { env as _env } from "fastly:env";

export * from "../runtime.ts";
export { default } from "../runtime.ts";

/** Returns all environment variables in an object. */
export function env(): { [name: string]: string; };
/** Returns a specific environment variable. */
export function env(name: string): string | undefined;
/**
 * Sets the value of a specific environment variable.
 * 
 * NOTE: This is a temporary change and will not persist when the program exits.
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
    if (typeof name === "object") {
        throw new Error("Not implemented");
    } else if (value !== undefined) {
        throw new Error("Not implemented");
    }

    return _env(name);
}
