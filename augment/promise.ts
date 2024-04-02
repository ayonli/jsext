import { after, sleep, timeout, until } from "../promise.ts";

declare global {
    interface PromiseConstructor {
        /** Try to resolve a promise with a timeout limit. */
        timeout<T>(value: T | Promise<T>, ms: number): Promise<T>;
        /** Resolves a promise only after the given duration. */
        after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>;
        /** Blocks the context for a given time. */
        sleep(ms: number): Promise<void>;
        /** Blocks the context until the test passes. */
        until(test: () => boolean | Promise<boolean>): Promise<void>;
    }
}

Promise.timeout = timeout;
Promise.after = after;
Promise.sleep = sleep;
Promise.until = until;
