const throttleCaches = new Map();
function throttle(handler, options) {
    const key = typeof options === "number" ? null : options.for;
    const duration = typeof options === "number" ? options : options.duration;
    const noWait = typeof options === "number" ? false : !!(options === null || options === void 0 ? void 0 : options.noWait);
    const handleCall = function (cache, ...args) {
        var _a;
        if (cache.result && ((cache.pending && noWait) || Date.now() < ((_a = cache.expires) !== null && _a !== void 0 ? _a : 0))) {
            if (cache.result.error) {
                throw cache.result.error;
            }
            else {
                return cache.result.value;
            }
        }
        else if (cache.pending) {
            return cache.pending;
        }
        try {
            const returns = handler.call(this, ...args);
            if (typeof (returns === null || returns === void 0 ? void 0 : returns.then) === "function") {
                cache.pending = returns.then(value => {
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
                if (noWait && cache.result) {
                    if (cache.result.error) {
                        throw cache.result.error;
                    }
                    else {
                        return cache.result.value;
                    }
                }
                else {
                    return cache.pending;
                }
            }
            else {
                cache.result = { value: returns };
                cache.expires = Date.now() + duration;
                return returns;
            }
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
