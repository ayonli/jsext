import { after, sleep, timeout, until } from "../async.ts";

declare global {
    interface PromiseConstructor {
        /** Try to resolve a promise with a timeout limit. */
        timeout<T>(value: T | Promise<T>, ms: number): Promise<T>;
        /** Resolves a promise only after the given duration. */
        after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>;
        /** Blocks the context for a given duration. */
        sleep(ms: number): Promise<void>;
        /**
         * Blocks the context until the test returns a truthy value, which is not `false`,
         * `null` or `undefined`. If the test throws an error, it will be treated as a
         * falsy value and the loop continues.
         * 
         * This functions returns the same result as the test function when passed.
         */
        until<T>(test: () => T | Promise<T>): Promise<T extends false | null | undefined ? never : T>;
    }
}

Promise.timeout = timeout;
Promise.after = after;
Promise.sleep = sleep;
Promise.until = until;
