import { after, sleep, timeout } from ".";

declare global {
    interface PromiseConstructor {
        /** Try to resolve a promise with a timeout limit. */
        timeout<T>(value: T | Promise<T>, ms: number): Promise<T>;
        /** Resolves a promise only after the given duration. */
        after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>;
        /** Blocks the context for a given time. */
        sleep(ms: number): Promise<void>;
    }
}

Promise.timeout = timeout;
Promise.after = after;
Promise.sleep = sleep;
