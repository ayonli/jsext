const throttleCaches = new Map();
function throttle(handler, options) {
    const key = typeof options === "number" ? null : options.for;
    const duration = typeof options === "number" ? options : options.duration;
    const handleCall = function (cache, ...args) {
        var _a;
        if (cache.result && Date.now() < ((_a = cache.expires) !== null && _a !== void 0 ? _a : 0)) {
            if (cache.result.error) {
                throw cache.result.error;
            }
            else {
                return cache.result.value;
            }
        }
        try {
            const returns = handler.call(this, ...args);
            cache.result = { value: returns };
            cache.expires = Date.now() + duration;
            return returns;
        }
        catch (error) {
            cache.result = { error };
            cache.expires = Date.now() + duration;
            throw error;
        }
    };
    if (!key) {
        const cache = { for: null };
        return function (...args) {
            return handleCall.call(this, cache, ...args);
        };
    }
    else {
        let cache = throttleCaches.get(key);
        if (!cache) {
            cache = { for: key };
            throttleCaches.set(key, cache);
        }
        return function (...args) {
            return handleCall.call(this, cache, ...args);
        };
    }
}

export { throttle as default };
//# sourceMappingURL=throttle.js.map
