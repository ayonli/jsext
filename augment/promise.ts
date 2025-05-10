import { pace, sleep, timeout, until, select } from "@jsext/async";

declare global {
    interface PromiseConstructor {
        /** Try to resolve the promise with a timeout limit. */
        timeout<T>(value: PromiseLike<T>, ms: number): Promise<T>;
        /** Slows down and resolves the promise only after the given duration. */
        pace<T>(value: PromiseLike<T>, ms: number): Promise<T>;
        /** Blocks the context for a given duration. */
        sleep(ms: number): Promise<void>;
        /**
         * Blocks the context until the test returns a truthy value, which is not `false`,
         * `null` or `undefined`. If the test throws an error, it will be treated as a
         * falsy value and the loop continues.
         * 
         * This functions returns the same result as the test function when passed.
         */
        until<T>(test: () => T | PromiseLike<T>): Promise<T extends false | null | undefined ? never : T>;
        /**
         * Runs multiple tasks concurrently and returns the result of the first task that
         * completes. The rest of the tasks will be aborted.
         */
        select<T>(
            tasks: (PromiseLike<T> | ((signal: AbortSignal) => PromiseLike<T>))[],
            signal?: AbortSignal | undefined
        ): Promise<T>;
    }
}

Promise.timeout = timeout;
Promise.pace = pace;
Promise.sleep = sleep;
Promise.until = until;
Promise.select = select;
