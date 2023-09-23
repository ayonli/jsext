/** Try to resolve a promise with a timeout limit. */
export async function timeout<T>(value: T | PromiseLike<T>, ms: number): Promise<T> {
    const result = await Promise.race([
        value,
        new Promise<T>((_, reject) => setTimeout(() => {
            reject(new Error(`operation timeout after ${ms}ms`));
        }, ms))
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

/** Blocks the context for a given time. */
export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Blocks the context until the test is passed. */
export async function until(test: () => boolean | Promise<boolean>): Promise<void> {
    do {
        await new Promise<void>(resolve => setTimeout(resolve));
    } while ((await test()) == false);
}
