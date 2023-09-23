/** Try to resolve a promise with a timeout limit. */
async function timeout(value, ms) {
    const result = await Promise.race([
        value,
        new Promise((_, reject) => setTimeout(() => {
            reject(new Error(`operation timeout after ${ms}ms`));
        }, ms))
    ]);
    return result;
}
/** Resolves a promise only after the given duration. */
async function after(value, ms) {
    const [result] = await Promise.allSettled([
        value,
        new Promise(resolve => setTimeout(resolve, ms))
    ]);
    if (result.status === "fulfilled") {
        return result.value;
    }
    else {
        throw result.reason;
    }
}
/** Blocks the context for a given time. */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/** Blocks the context until the test is passed. */
async function until(test) {
    do {
        await new Promise(resolve => setTimeout(resolve));
    } while ((await test()) == false);
}

export { after, sleep, timeout, until };
//# sourceMappingURL=index.js.map
