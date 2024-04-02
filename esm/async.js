import { unrefTimer } from './util.js';

/**
 * Functions for async/promise context handling.
 * @module
 */
/** Try to resolve a promise with a timeout limit. */
async function timeout(value, ms) {
    const result = await Promise.race([
        value,
        new Promise((_, reject) => unrefTimer(setTimeout(() => {
            reject(new Error(`operation timeout after ${ms}ms`));
        }, ms)))
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
/** Blocks the context until the test passes. */
async function until(test) {
    while ((await test()) === false) {
        await sleep(0);
    }
}

export { after, sleep, timeout, until };
//# sourceMappingURL=async.js.map
