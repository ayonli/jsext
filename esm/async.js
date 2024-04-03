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
/** Blocks the context for a given duration. */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Blocks the context until the test returns a truthy value, which is not `false`,
 * `null` or `undefined`. If the test throws an error, it will be treated as a
 * falsy value and the loop continues.
 *
 * This functions returns the same result as the test function when passed.
 */
async function until(test) {
    while (true) {
        try {
            const result = await test();
            if (result !== false && result !== null && result !== undefined) {
                return result;
            }
            else {
                await sleep(0);
            }
        }
        catch (_a) {
            await sleep(0);
        }
    }
}

export { after, sleep, timeout, until };
//# sourceMappingURL=async.js.map
