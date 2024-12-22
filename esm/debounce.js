import { asyncTask } from './async.js';

/**
 * Debounces function calls for frequent access.
 * @module
 */
const registry = new Map();
function debounce(handler, options, reducer = undefined) {
    const signal = typeof options === "number" ? undefined : options.signal;
    const delay = typeof options === "number" ? options : options.delay;
    const key = typeof options === "number" ? null : options.for;
    const hasKey = key !== null && key !== undefined && key !== "";
    let _cache = hasKey ? registry.get(key) : undefined;
    if (!_cache) {
        _cache = {
            for: key,
            tasks: [],
            data: undefined,
            timer: undefined,
        };
        if (hasKey) {
            registry.set(key, _cache);
        }
    }
    const cache = _cache;
    const getResolvers = (cache) => {
        // Move tasks and cached data to new variables, so during the middle
        // of handler running, new calls won't interfere the running process.
        const _tasks = cache.tasks;
        const data = cache.data;
        cache.tasks = [];
        cache.data = undefined;
        if (hasKey) {
            registry.delete(key);
        }
        const resolve = (result) => {
            _tasks.forEach(({ resolve }) => resolve(result));
        };
        const reject = (err) => {
            _tasks.forEach(({ reject }) => reject(err));
        };
        return { resolve, reject, data };
    };
    signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", () => {
        cache.timer && clearTimeout(cache.timer);
        const { reject } = getResolvers(cache);
        reject(signal.reason);
    });
    return async function (data) {
        if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
            throw signal.reason;
        }
        if (typeof reducer === "function" && cache.data !== undefined) {
            cache.data = reducer(cache.data, data);
        }
        else {
            cache.data = data;
        }
        cache.timer && clearTimeout(cache.timer);
        cache.timer = setTimeout((cache) => {
            const { resolve, reject, data } = getResolvers(cache);
            try {
                const res = handler.call(this, data);
                if (typeof (res === null || res === void 0 ? void 0 : res.then) === "function") {
                    Promise.resolve(res).then(resolve, reject);
                }
                else {
                    resolve(res);
                }
            }
            catch (err) {
                reject(err);
            }
        }, delay, cache);
        const task = asyncTask();
        cache.tasks.push(task);
        return await task;
    };
}

export { debounce as default };
//# sourceMappingURL=debounce.js.map
