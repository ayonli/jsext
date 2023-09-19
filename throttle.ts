type ThrottleCache = {
    for: any;
    expires?: number;
    result?: { value?: any; error?: unknown; };
};
const throttleCaches = new Map<any, ThrottleCache>();

/**
 * Creates a throttled function that will only be run once in a certain amount of time.
 * 
 * If a subsequent call happens within the `duration`, the previous result will be returned and
 * the `handler` function will not be invoked.
 */
export default function throttle<T, Fn extends (this: T, ...args: any[]) => any>(
    handler: Fn,
    duration: number
): Fn;
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
        if (cache.result && Date.now() < (cache.expires ?? 0)) {
            if (cache.result.error) {
                throw cache.result.error;
            } else {
                return cache.result.value;
            }
        }

        try {
            const returns = handler.call(this, ...args);
            cache.result = { value: returns };
            cache.expires = Date.now() + duration;
            return returns;
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
