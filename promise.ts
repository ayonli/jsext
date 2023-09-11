export { };

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

Promise.timeout = async <T>(value: T | Promise<T>, ms: number) => {
    const result = await Promise.race([
        value,
        new Promise<T>((_, reject) => setTimeout(() => {
            reject(new Error(`operation timeout after ${ms}ms`));
        }, ms))
    ]);
    return result;
};

Promise.after = async (value, ms) => {
    const [result] = await Promise.allSettled([
        value,
        new Promise<void>(resolve => setTimeout(resolve, ms))
    ]);

    if (result.status === "fulfilled") {
        return result.value;
    } else {
        throw result.reason;
    }
};

Promise.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
