/**
 * Debounces function calls for frequent access.
 * @module
 */

import { AsyncTask, asyncTask } from "./async.ts";

type Debounce = {
    for: any;
    tasks: AsyncTask<any>[];
    data: any;
    timer: NodeJS.Timeout | number | undefined;
};
const registry = new Map<any, Debounce>();

/**
 * Options for the {@link debounce} function.
 */
export interface DebounceOptions {
    /**
     * The delay duration (in milliseconds) to wait before invoking the
     * handler function.
     */
    delay: number,
    /**
     * Use the debounce strategy `for` the given key, this will keep the
     * debounce context in a global registry, binding new `handler` function
     * for the same key will override the previous settings. This mechanism
     * guarantees that both creating the debounced function in function
     * scopes and overwriting the handler are possible.
     */
    for?: any;
    /**
     * Cancel the pending task if the signal is aborted.
     */
    signal?: AbortSignal;
}

/**
 * Creates a debounced function that delays invoking `handler` until after
 * `delay` duration (in milliseconds) have elapsed since the last time the
 * debounced function was invoked. 
 * 
 * If a subsequent call happens within the `delay` duration (in milliseconds),
 * the previous call will be canceled and it will result in the same return
 * value  as the new call's.
 * 
 * Optionally, we can provide a `reducer` function to merge data before
 * processing so multiple calls can be merged into one.
 * 
 * @example
 * ```ts
 * import debounce from "@ayonli/jsext/debounce";
 * import { sleep } from "@ayonli/jsext/async";
 * 
 * let count = 0;
 * 
 * const fn = debounce((obj: { foo?: string; bar?: string }) => {
 *     count++;
 *     return obj;
 * }, 1_000);
 * 
 * const [res1, res2] = await Promise.all([
 *     fn({ foo: "hello", bar: "world" }),
 *     sleep(100).then(() => fn({ foo: "hi" })),
 * ]);
 * 
 * console.log(res1); // { foo: "hi" }
 * console.log(res2); // { foo: "hi" }
 * console.log(count); // 1
 * ```
 * 
 * @example
 * ```ts
 * // with reducer
 * import debounce from "@ayonli/jsext/debounce";
 * 
 * const fn = debounce((obj: { foo?: string; bar?: string }) => {
 *     return obj;
 * }, 1_000, (prev, curr) => {
 *     return { ...prev, ...curr };
 * });
 * 
 * const [res1, res2] = await Promise.all([
 *     fn({ foo: "hello", bar: "world" }),
 *     fn({ foo: "hi" }),
 * ]);
 * 
 * console.log(res1); // { foo: "hi", bar: "world" }
 * console.assert(res2 === res1);
 * ```
 */
export default function debounce<I, T, R>(
    handler: (this: I, data: T) => R | Promise<R>,
    delay: number,
    reducer?: (prev: T, current: T) => T
): (this: I, data: T) => Promise<R>;
/**
 * @example
 * ```ts
 * import debounce from "@ayonli/jsext/debounce";
 * 
 * const key = "unique_key"
 * let count = 0;
 * 
 * const [res1, res2] = await Promise.all([
 *     debounce(async (obj: { foo?: string; bar?: string }) => {
 *         count += 1;
 *         return await Promise.resolve(obj);
 *     }, { delay: 5, for: "foo" }, (prev, data) => {
 *         return { ...prev, ...data };
 *     })({ foo: "hello", bar: "world" }),
 *
 *     debounce(async (obj: { foo?: string; bar?: string }) => {
 *         count += 2;
 *         return await Promise.resolve(obj);
 *     }, { delay: 5, for: "foo" }, (prev, data) => {
 *         return { ...prev, ...data };
 *     })({ foo: "hi" }),
 * ]);
 *
 * console.log(res1); // { foo: "hi", bar: "world" }
 * console.assert(res1 === res2);
 * console.assert(count === 2);
 * ```
 */
export default function debounce<I, T, R>(
    handler: (this: I, data: T) => R | Promise<R>,
    options: DebounceOptions,
    reducer?: (prev: T, current: T) => T
): (this: I, data: T) => Promise<R>;
export default function debounce<I, T = any, R = any>(
    handler: (this: I, data: T) => R | Promise<R>,
    options: number | DebounceOptions,
    reducer: ((prev: T, current: T) => T) | undefined = undefined,
): (this: I, data: T) => Promise<R> {
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
    const getResolvers = (cache: Debounce) => {
        // Move tasks and cached data to new variables, so during the middle
        // of handler running, new calls won't interfere the running process.
        const _tasks = cache.tasks;
        const data = cache.data as T;
        cache.tasks = [];
        cache.data = undefined;

        if (hasKey) {
            registry.delete(key);
        }

        const resolve = (result: R) => {
            _tasks.forEach(({ resolve }) => resolve(result));
        };
        const reject = (err: unknown) => {
            _tasks.forEach(({ reject }) => reject(err));
        };

        return { resolve, reject, data };
    };

    signal?.addEventListener("abort", () => {
        cache.timer && clearTimeout(cache.timer);
        const { reject } = getResolvers(cache);
        reject(signal.reason);
    });

    return async function (this: I, data: T) {
        if (signal?.aborted) {
            throw signal.reason;
        }

        if (typeof reducer === "function" && cache.data !== undefined) {
            cache.data = reducer(cache.data, data);
        } else {
            cache.data = data;
        }

        cache.timer && clearTimeout(cache.timer);
        cache.timer = setTimeout((cache) => {
            const { resolve, reject, data } = getResolvers(cache);

            try {
                const res = handler.call(this, data) as any;

                if (typeof res?.then === "function") {
                    Promise.resolve(res).then(resolve, reject);
                } else {
                    resolve(res);
                }
            } catch (err) {
                reject(err);
            }
        }, delay, cache);

        const task = asyncTask<R>();
        cache.tasks.push(task);
        return await task;
    };
}
