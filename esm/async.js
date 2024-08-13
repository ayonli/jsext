import { unrefTimer } from './runtime.js';
import Exception from './error/Exception.js';

/**
 * Functions for async/promise context handling.
 * @module
 */
/**
 * Creates a promise that can be resolved or rejected manually.
 *
 * This function is like `Promise.withResolvers` but less verbose.
 *
 * @example
 * ```ts
 * import { asyncTask } from "@ayonli/jsext/async";
 *
 * const task = asyncTask<number>();
 *
 * setTimeout(() => task.resolve(42), 1000);
 *
 * const result = await task;
 * console.log(result); // 42
 * ```
 */
function asyncTask() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return Object.assign(promise, {
        resolve: resolve,
        reject: reject
    });
}
function abortable(task, signal) {
    if (typeof task[Symbol.asyncIterator] === "function" &&
        typeof task.then !== "function" // this skips ThenableAsyncGenerator
    ) {
        return abortableAsyncIterable(task, signal);
    }
    else {
        return select([task], signal);
    }
}
async function* abortableAsyncIterable(task, signal) {
    if (signal.aborted) {
        throw signal.reason;
    }
    const aTask = asyncTask();
    const handleAbort = () => aTask.reject(signal.reason);
    signal.addEventListener("abort", handleAbort, { once: true });
    const it = task[Symbol.asyncIterator]();
    while (true) {
        const race = Promise.race([it.next(), aTask]);
        race.catch(() => {
            signal.removeEventListener("abort", handleAbort);
        });
        const { done, value } = await race;
        if (done) {
            signal.removeEventListener("abort", handleAbort);
            return value; // async iterator may return a value
        }
        else {
            yield value;
        }
    }
}
/**
 * Try to resolve a promise with a timeout limit.
 *
 * @example
 * ```ts
 * import { timeout, sleep } from "@ayonli/jsext/async";
 *
 * const task = sleep(1000);
 *
 * await timeout(task, 500); // throws TimeoutError after 500ms
 * ```
 */
async function timeout(task, ms) {
    const result = await Promise.race([
        task,
        new Promise((_, reject) => unrefTimer(setTimeout(() => {
            reject(new Exception(`operation timeout after ${ms}ms`, {
                name: "TimeoutError",
                code: 408,
            }));
        }, ms)))
    ]);
    return result;
}
/**
 * Resolves a promise only after the given duration.
 *
 * @example
 * ```ts
 * import { after } from "@ayonli/jsext/async";
 *
 * const task = fetch("https://example.com")
 * const res = await after(task, 1000);
 *
 * console.log(res); // the response will not be printed unless 1 second has passed
 * ```
 */
async function after(task, ms) {
    const [result] = await Promise.allSettled([
        task,
        new Promise(resolve => setTimeout(resolve, ms))
    ]);
    if (result.status === "fulfilled") {
        return result.value;
    }
    else {
        throw result.reason;
    }
}
/**
 * Blocks the context for a given duration.
 *
 * @example
 * ```ts
 * import { sleep } from "@ayonli/jsext/async";
 *
 * console.log("Hello");
 *
 * await sleep(1000);
 * console.log("World"); // "World" will be printed after 1 second
 * ```
 */
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Blocks the current routine until the test returns a truthy value, which is
 * not `false`, `null` or `undefined`. If the test throws an error, it will be
 * treated as a falsy value and the check continues.
 *
 * This functions returns the same result as the test function when passed.
 *
 * @example
 * ```ts
 * import { until } from "@ayonli/jsext/async";
 *
 * // wait for the header element to be present in the DOM
 * const ele = await until(() => document.querySelector("header"));
 * ```
 */
async function until(test) {
    return new Promise((resolve) => {
        let ongoing = false;
        const timer = setInterval(async () => {
            if (ongoing)
                return;
            try {
                ongoing = true;
                const result = await test();
                if (result !== false && result !== null && result !== undefined) {
                    clearInterval(timer);
                    resolve(result);
                }
            }
            catch (_a) {
                // ignore
            }
            finally {
                ongoing = false;
            }
        }, 1);
    });
}
/**
 * Runs multiple tasks concurrently and returns the result of the first task that
 * completes. The rest of the tasks will be aborted.
 *
 * @param tasks An array of promises or functions that return promises.
 * @param signal A parent abort signal, if provided and aborted before any task
 *  completes, the function will reject immediately with the abort reason and
 *  cancel all the tasks.
 *
 * @example
 * ```ts
 * import { select } from "@ayonli/jsext/async";
 *
 * const result = await select([
 *     signal => fetch("https://example.com", { signal }),
 *     signal => fetch("https://example.org", { signal }),
 *     fetch("https://example.net"), // This task cannot actually be aborted, but ignored
 * ]);
 *
 * console.log(result);
 * ```
 */
async function select(tasks, signal = undefined) {
    if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
        throw signal.reason;
    }
    const ctrl = signal ? abortWith(signal) : new AbortController();
    const { signal: _signal } = ctrl;
    tasks = [
        ...tasks,
        new Promise((_, reject) => {
            _signal.addEventListener("abort", () => {
                reject(_signal.reason);
            }, { once: true });
        })
    ];
    return await Promise.race(tasks.map(task => {
        return typeof task === "function" ? task(_signal) : task;
    })).finally(() => {
        _signal.aborted || ctrl.abort();
    });
}
/**
 * Creates a new abort controller with a `parent` signal, the new abort signal
 * will be aborted if the controller's `abort` method is called or when the
 * parent signal is aborted, whichever happens first.
 *
 * @example
 * ```ts
 * import { abortWith } from "@ayonli/jsext/async";
 *
 * const parent = new AbortController();
 * const child1 = abortWith(parent.signal);
 * const child2 = abortWith(parent.signal);
 *
 * child1.abort();
 *
 * console.assert(child1.signal.aborted);
 * console.assert(!parent.signal.aborted);
 *
 * parent.abort();
 *
 * console.assert(child2.signal.aborted);
 * console.assert(child2.signal.reason === parent.signal.reason);
 * ```
 */
function abortWith(parent) {
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const abort = () => {
        signal.aborted || ctrl.abort(parent.reason);
    };
    parent.addEventListener("abort", abort, { once: true });
    signal.addEventListener("abort", () => {
        parent.aborted || parent.removeEventListener("abort", abort);
    });
    return ctrl;
}

export { abortWith, abortable, after, asyncTask, select, sleep, timeout, until };
//# sourceMappingURL=async.js.map
