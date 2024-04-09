/**
 * Functions for async/promise context handling.
 * @module
 */

import { unrefTimer } from "./util.ts";

/** Try to resolve a promise with a timeout limit. */
export async function timeout<T>(value: T | PromiseLike<T>, ms: number): Promise<T> {
    const result = await Promise.race([
        value,
        new Promise<T>((_, reject) => unrefTimer(setTimeout(() => {
            reject(new Error(`operation timeout after ${ms}ms`));
        }, ms)))
    ]);
    return result;
}

/** Resolves a promise only after the given duration. */
export async function after<T>(value: T | PromiseLike<T>, ms: number): Promise<T> {
    const [result] = await Promise.allSettled([
        value,
        new Promise<void>(resolve => setTimeout(resolve, ms))
    ]);

    if (result.status === "fulfilled") {
        return result.value;
    } else {
        throw result.reason;
    }
}

/** Blocks the context for a given duration. */
export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Blocks the context until the test returns a truthy value, which is not `false`,
 * `null` or `undefined`. If the test throws an error, it will be treated as a
 * falsy value and the loop continues.
 * 
 * This functions returns the same result as the test function when passed.
 */
export async function until<T>(
    test: () => T | Promise<T>
): Promise<T extends false | null | undefined ? never : T> {
    while (true) {
        try {
            const result = await test();

            if (result !== false && result !== null && result !== undefined) {
                return result as any;
            } else {
                await sleep(0);
            }
        } catch {
            await sleep(0);
        }
    }
}

/**
 * Runs multiple tasks concurrently and returns the result of the first task that
 * completes. The rest of the tasks will be aborted.
 * 
 * @example
 * ```ts
 * import { select } from "@ayonli/jsext/async";
 * 
 * const result = await select([
 *     signal => fetch("https://example.com", { signal }),
 *     signal => fetch("https://example.org", { signal }),
 * ]);
 * 
 * console.log(result);
 * ```
 */
export async function select<T>(tasks: ((signal: AbortSignal) => Promise<T>)[]): Promise<T> {
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const result = await Promise.race(tasks.map(fn => fn(signal)));
    ctrl.abort();
    return result;
}

/** A promise that can be resolved or rejected manually. */
export type AsyncTask<T> = Promise<T> & {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
};

/**
 * Creates a promise that can be resolved or rejected manually.
 * 
 * This function is like `Promise.withResolvers` but less verbose.
 */
export function asyncTask<T>(): AsyncTask<T> {
    let resolve: (value: T) => void;
    let reject: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    }) as AsyncTask<T>;

    return Object.assign(promise, {
        resolve: resolve!,
        reject: reject!
    });
}
