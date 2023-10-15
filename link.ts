import {
    ThenableAsyncGenerator,
    ThenableAsyncGeneratorLike
} from "./external/thenable-generator/index.ts";
import type { Abortable } from "./run.ts";
import run from "./run.ts";

export type FunctionPropertyNames<T> = {
    [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
export type FunctionProperties<T> = Readonly<Pick<T, FunctionPropertyNames<T>>>;
export type RemoteFunctions<M, T extends FunctionProperties<M> = FunctionProperties<M>> = {
    [K in keyof T]: T[K] extends (...args: infer A) => AsyncGenerator<infer T, infer R, infer N> ? (...args: A) => (AsyncGenerator<T, R, N> & Abortable)
    : T[K] extends (...args: infer A) => Generator<infer T, infer R, infer N> ? (...args: A) => (AsyncGenerator<T, R, N> & Abortable)
    : T[K] extends (...args: infer A) => Promise<infer R> ? (...args: A) => (Promise<R> & Abortable)
    : T[K] extends (...args: infer A) => infer R ? (...args: A) => (Promise<R> & Abortable)
    : T[K];
};

class RemoteCall extends ThenableAsyncGenerator {
    constructor(
        source: ThenableAsyncGeneratorLike,
        public abort: (reason?: unknown) => Promise<void>
    ) {
        super(source);
    }
}


/**
 * Creates a remote module wrapper whose functions are run in another thread.
 * 
 * This function uses {@link run}() under the hood.
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
export default function link<M extends { [x: string]: any; }>(mod: () => Promise<M>, options: {
    /** Automatically abort the task when timeout (in milliseconds). */
    timeout?: number;
    /**
     * Instead of dropping the worker after the task has completed, keep it alive so that it can
     * be reused by other tasks.
     * 
     * Be aware, keep-alive with `child_process` adapter will prevent the main process to exit in
     * Node.js.
     * 
     * Unlink `run()`, this option is enabled by default in `link()`, set its value to `false` if
     * we want to disable it.
     */
    keepAlive?: boolean;
    /**
     * Choose whether to use `worker_threads` or `child_process` for running the script.
     * The default setting is `worker_threads`.
     * 
     * In browser or Deno, this option is ignored and will always use the web worker.
     */
    adapter?: "worker_threads" | "child_process";
} = {}): RemoteFunctions<M> {
    return new Proxy(Object.create(null), {
        get: (_, prop: string) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args: Parameters<M["_"]>) => {
                    let job: Awaited<ReturnType<typeof run>>;
                    let iter: AsyncIterator<unknown>;

                    return new RemoteCall({
                        async next() {
                            job ??= await run(mod, args, {
                                ...options,
                                fn: prop as "_",
                                keepAlive: options.keepAlive ?? true,
                            });

                            iter ??= job.iterate()[Symbol.asyncIterator]();
                            let { done = false, value } = await iter.next();

                            if (done) {
                                // HACK: this will set the internal result of ThenableAsyncGenerator
                                // to the result of the job.
                                value = await job.result();
                            }

                            return Promise.resolve({ done, value });
                        },
                        async throw(err: unknown) {
                            await job?.abort(err);
                            throw err;
                        },
                        async return(value) {
                            await job?.abort();
                            return { value, done: true };
                        },
                        async then(onfulfilled, onrejected) {
                            job ??= await run(mod, args, {
                                ...options,
                                fn: prop as "_",
                                keepAlive: options.keepAlive ?? true,
                            });
                            return job.result().then(onfulfilled, onrejected);
                        },
                    }, async (reason: unknown = undefined) => {
                        return await job?.abort(reason);
                    });
                }
            };

            return obj[prop];
        }
    }) as any;
}
