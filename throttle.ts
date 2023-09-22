type ThrottleCache = {
    for: any;
    expires?: number;
    result?: { value?: any; error?: unknown; };
    pending?: Promise<any>;
};
const throttleCaches = new Map<any, ThrottleCache>();

/**
 * Creates a throttled function that will only be run once in a certain amount of time.
 * 
 * If a subsequent call happens within the `duration`, the previous result will be returned and
 * the `handler` function will not be invoked.
 * 
 * If the `handler` function returns a promise, and two or more calls happen simultaneously,
 * the later calls will try to resolve with the previous result immediately instead of waiting
 * the pending call to complete.
 * 
 * @example
 * ```ts
 * const fn = throttle((input: string) => input, 1_000);
 * console.log(fn("foo")); // foo
 * console.log(fn("bar")); // foo
 * 
 * await Promise.sleep(1_000);
 * console.log(fn("bar")); // bar
 * ```
 */
export default function throttle<T, Fn extends (this: T, ...args: any[]) => any>(
    handler: Fn,
    duration: number
): Fn;
/**
 * @example
 * ```ts
 * const out1 = await throttle(() => Promise.resolve("foo"), { duration: 1_000, for: "example" })();
 * console.log(out1); // foo
 * 
 * const out2 = await throttle(() => Promise.resolve("bar"), { duration: 1_000, for: "example" })();
 * console.log(out2); // foo
 * 
 * await Promise.sleep(1_000);
 * const out3 = await throttle(() => Promise.resolve("bar"), { duration: 1_000, for: "example" })();
 * console.log(out3); // bar
 * ```
 */
export default function throttle<T, Fn extends (this: T, ...args: any[]) => any>(handler: Fn, options: {
    duration: number;
    /**
     * Use the throttle strategy `for` the given key, this will keep the result in a global
     * cache, binding new `handler` function for the same key will result in the same result
     * as the previous, unless the duration has passed. This mechanism guarantees that both
     * creating the throttled function in function scopes and overwriting the handler are
     * possible.
     */
    for?: any;
}): Fn;
export default function throttle(handler: (this: any, ...args: any[]) => any, options: number | {
    duration: number;
    for?: any;
}) {
    const key = typeof options === "number" ? null : options.for;
    const duration = typeof options === "number" ? options : options.duration;

    const handleCall = function (
        this: any,
        cache: ThrottleCache,
        ...args: any[]
    ) {
        if (cache.result && (cache.pending || Date.now() < (cache.expires ?? 0))) {
            if (cache.result.error) {
                throw cache.result.error;
            } else {
                return cache.result.value;
            }
        } else if (cache.pending) {
            return cache.pending;
        }

        try {
            let returns = handler.call(this, ...args);

            if (typeof returns?.then === "function") {
                cache.pending = returns = (returns as Promise<any>).then(value => {
                    cache.pending = undefined;
                    cache.result = { value };
                    cache.expires = Date.now() + duration;
                    return value;
                }).catch(error => {
                    cache.pending = undefined;
                    cache.result = { error };
                    cache.expires = Date.now() + duration;
                    throw error;
                });

                return returns;
            } else {
                cache.result = { value: returns };
                cache.expires = Date.now() + duration;
                return returns;
            }
        } catch (error) {
            cache.result = { error };
            cache.expires = Date.now() + duration;
            throw error;
        }
    };

    if (!key) {
        const cache: ThrottleCache = { for: null };
        return function (this: any, ...args: any[]) {
            return handleCall.call(this, cache, ...args);
        };
    } else {
        let cache = throttleCaches.get(key);

        if (!cache) {
            cache = { for: key };
            throttleCaches.set(key, cache);
        }

        return function (this: any, ...args: any[]) {
            return handleCall.call(this, cache as ThrottleCache, ...args);
        };
    }
}
