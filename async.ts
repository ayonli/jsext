/**
 * Functions for async/promise context handling.
 * @module
 */

import { unrefTimer } from "./runtime.ts";

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
    let resolve: (value: T | PromiseLike<T>) => void;
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

/**
 * Try to resolve a promise with an abort signal.
 * 
 * **NOTE:** This function does not cancel the task itself, it only prematurely
 * breaks the current routine when the signal is aborted. In order to support
 * cancellation, the task must be designed to handle the abort signal itself.
 */
export function abortable<T>(task: PromiseLike<T>, signal: AbortSignal): Promise<T>;
/**
 * Wraps an async iterable object with an abort signal.
 */
export function abortable<T>(task: AsyncIterable<T>, signal: AbortSignal): AsyncIterable<T>;
export function abortable<T>(
    task: PromiseLike<T> | AsyncIterable<T>,
    signal: AbortSignal
): Promise<T> | AsyncIterable<T> {
    if (typeof (task as any)[Symbol.asyncIterator] === "function" &&
        typeof (task as any).then !== "function" // this skips ThenableAsyncGenerator
    ) {
        return abortableAsyncIterable(task as AsyncIterable<T>, signal);
    } else {
        if (signal.aborted) {
            return Promise.reject(signal.reason);
        }

        const aTask = asyncTask<never>();
        const handleAbort = () => aTask.reject(signal.reason);
        signal.addEventListener("abort", handleAbort, { once: true });

        return Promise.race([task as PromiseLike<T>, aTask]).finally(() => {
            signal.removeEventListener("abort", handleAbort);
        });
    }
}

async function* abortableAsyncIterable<T>(
    task: AsyncIterable<T>,
    signal: AbortSignal
): AsyncIterable<T> {
    if (signal.aborted) {
        throw signal.reason;
    }

    const aTask = asyncTask<never>();
    const handleAbort = () => aTask.reject(signal.reason);
    signal.addEventListener("abort", handleAbort, { once: true });

    const it = task[Symbol.asyncIterator]();

    while (true) {
        const race = Promise.race([it.next(), aTask]);

        race.catch(() => {
            signal.removeEventListener("abort", handleAbort);
        });

        const { done, value } = await race;

        if (done) {
            signal.removeEventListener("abort", handleAbort);
            return value; // async iterator may return a value
        } else {
            yield value;
        }
    }
}

/** Try to resolve a promise with a timeout limit. */
export async function timeout<T>(task: PromiseLike<T>, ms: number): Promise<T> {
    const result = await Promise.race([
        task,
        new Promise<T>((_, reject) => unrefTimer(setTimeout(() => {
            reject(new Error(`operation timeout after ${ms}ms`));
        }, ms)))
    ]);
    return result;
}

/** Resolves a promise only after the given duration. */
export async function after<T>(task: PromiseLike<T>, ms: number): Promise<T> {
    const [result] = await Promise.allSettled([
        task,
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
 * Blocks the current routine until the test returns a truthy value, which is
 * not `false`, `null` or `undefined`. If the test throws an error, it will be
 * treated as a falsy value and the loop continues.
 * 
 * This functions returns the same result as the test function when passed.
 */
export async function until<T>(
    test: () => T | Promise<T>
): Promise<T extends false | null | undefined ? never : T> {
    return new Promise((resolve) => {
        let ongoing = false;
        const timer = setInterval(async () => {
            if (ongoing) return;

            try {
                ongoing = true;
                const result = await test();

                if (result !== false && result !== null && result !== undefined) {
                    clearInterval(timer);
                    resolve(result as any);
                }
            } catch {
                // ignore
            } finally {
                ongoing = false;
            }
        }, 1);
    });
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
