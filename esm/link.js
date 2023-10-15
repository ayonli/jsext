import { ThenableAsyncGenerator } from './external/thenable-generator/index.js';
import run from './run.js';

class RemoteCall extends ThenableAsyncGenerator {
    constructor(source, abort) {
        super(source);
        this.abort = abort;
    }
}
/**
 * Creates a remote module wrapper whose functions are run in another thread.
 *
 * This function uses `run()` under the hood, and the remote function must be async.
 *
 * @example
 * ```ts
 * const mod = link(() => import("./job-example.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 *
 * @example
 * ```ts
 * const mod = link(() => import("./job-example.mjs"));
 *
 * for await (const word of mod.sequence(["foo", "bar"])) {
 *     console.log(word);
 * }
 * // output:
 * // foo
 * // bar
 * ```
 */
function link(mod, options = {}) {
    return new Proxy(Object.create(null), {
        get: (_, prop) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args) => {
                    let job;
                    let iter;
                    return new RemoteCall({
                        async next() {
                            var _a;
                            job !== null && job !== void 0 ? job : (job = await run(mod, args, {
                                ...options,
                                fn: prop,
                                keepAlive: (_a = options.keepAlive) !== null && _a !== void 0 ? _a : true,
                            }));
                            iter !== null && iter !== void 0 ? iter : (iter = job.iterate()[Symbol.asyncIterator]());
                            let { done = false, value } = await iter.next();
                            if (done) {
                                // HACK: this will set the internal result of ThenableAsyncGenerator
                                // to the result of the job.
                                value = await job.result();
                            }
                            return Promise.resolve({ done, value });
                        },
                        async throw(err) {
                            await (job === null || job === void 0 ? void 0 : job.abort(err));
                            throw err;
                        },
                        async return(value) {
                            await (job === null || job === void 0 ? void 0 : job.abort());
                            return { value, done: true };
                        },
                        async then(onfulfilled, onrejected) {
                            var _a;
                            job !== null && job !== void 0 ? job : (job = await run(mod, args, {
                                ...options,
                                fn: prop,
                                keepAlive: (_a = options.keepAlive) !== null && _a !== void 0 ? _a : true,
                            }));
                            return job.result().then(onfulfilled, onrejected);
                        },
                    }, async (reason = undefined) => {
                        return await (job === null || job === void 0 ? void 0 : job.abort(reason));
                    });
                }
            };
            return obj[prop];
        }
    });
}

export { RemoteCall, link as default };
//# sourceMappingURL=link.js.map
