import { isAsyncGenerator, isGenerator } from "check-iterable";
import type { Worker as NodeWorker } from "worker_threads";
import type { ChildProcess } from "child_process";
import { sequence } from "./number";

export interface Constructor<T> extends Function {
    new(...args: any[]): T;
    prototype: T;
}

export interface TypedArray extends Array<number> {
    readonly buffer: ArrayBufferLike;
    readonly byteLength: number;
    subarray(begin?: number, end?: number): TypedArray;
}

export type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
export type Ensured<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

const isNode = typeof process === "object" && process.versions?.node;

type ThrottleCache = {
    for: any;
    expires?: number;
    result?: { value?: any; error?: unknown; };
};
const throttleCaches = new Map<any, ThrottleCache>();

/**
 * The maximum number of workers is set to 4 times of the CPU core numbers.
 * 
 * The primary purpose of the workers is not mean to run tasks in parallel, but run them in separate
 * from the main thread, so that aborting tasks can be achieved by terminating the worker thread and
 * it will not affect the main thread.
 * 
 * That said, the worker thread can still be used to achieve parallelism, but it should be noticed
 * that only the numbers of tasks that equals to the CPU core numbers will be run at the same time.
 */
const maxWorkerNum = (() => {
    if (isNode) {
        return (require("os").cpus().length as number) * 4;
    } else {
        return 16;
    }
})();

const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
let workerPool: {
    workerId: number;
    worker: Worker | NodeWorker | ChildProcess;
    adapter: "worker_threads" | "child_process";
    busy: boolean;
}[] = [];

// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue: (() => void)[] = [];

/**
 * Merges properties and methods only if they're missing in the class. 
 */
function mergeIfNotExists(proto: object, source: object, mergeSuper = false) {
    let props = Reflect.ownKeys(source);

    for (let prop of props) {
        if (prop == "constructor") {
            continue;
        } else if (mergeSuper) {
            // When merging properties from super classes, the properties in the
            // base class has the first priority and shall not be overwrite.
            if (!(prop in proto)) {
                setProp(proto, source, <string | symbol>prop);
            }
        } else if (!proto.hasOwnProperty(prop)) {
            setProp(proto, source, <string | symbol>prop);
        }
    }

    return proto;
}

/**
 * Merges properties and methods across the prototype chain.
 */
function mergeHierarchy(ctor: Function, mixin: Function, mergeSuper = false) {
    mergeIfNotExists(ctor.prototype, mixin.prototype, mergeSuper);

    let _super = Object.getPrototypeOf(mixin);

    // Every user defined class or functions that can be instantiated have their
    // own names, if no name appears, that means the function has traveled to 
    // the root of the hierarchical tree.
    if (_super.name) {
        mergeHierarchy(ctor, _super, true);
    }
}

/**
 * Sets property for prototype based on the given source and prop name properly.
 */
function setProp(proto: any, source: any, prop: string | symbol) {
    let desc = Object.getOwnPropertyDescriptor(source, prop);

    if (desc) {
        Object.defineProperty(proto, prop, desc);
    } else {
        proto[prop] = source[prop];
    }
}

export interface JsExt {
    /**
     * Runs a function and catches any error happens inside it, returns the error and result
     * in a `[err, res]` tuple.
     */
    try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(
        fn: (...args: A) => AsyncGenerator<T, TReturn, TNext>,
        ...args: A
    ): AsyncGenerator<[E | null, T], [E | null, TReturn], TNext>;
    try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(
        fn: (...args: A) => Generator<T, TReturn, TNext>,
        ...args: A
    ): Generator<[E | null, T], [E | null, TReturn], TNext>;
    try<E = Error, R = any, A extends any[] = any[]>(
        fn: (...args: A) => Promise<R>,
        ...args: A
    ): Promise<[E | null, R]>;
    try<E = Error, R = any, A extends any[] = any[]>(
        fn: (...args: A) => R,
        ...args: A
    ): [E | null, R];
    /** Resolves a generator and renders its yield value in a `[err, val]` tuple. */
    try<E = Error, T = any, TReturn = any, TNext = unknown>(
        gen: AsyncGenerator<T, TReturn, TNext>
    ): AsyncGenerator<[E | null, T], [E | null, TReturn], TNext>;
    try<E = Error, T = any, TReturn = any, TNext = unknown>(
        gen: Generator<T, TReturn, TNext>
    ): Generator<[E | null, T], [E | null, TReturn], TNext>;
    /** Resolves a promise and returns the error and result in a `[err, res]` tuple. */
    try<E = Error, R = any>(job: Promise<R>): Promise<[E | null, R]>;

    /**
     * Inspired by Golang, creates a function that receives a `defer` function which can be used
     * to carry deferred jobs that will be run after the main function is complete.
     * 
     * Multiple calls of the `defer` function is supported, and the callbacks are called in the
     * LIFO order. Callbacks can be async functions if the main function is an async function or
     * an async generator function, and all the running procedures will be awaited.
     * 
     * @example
     *  const getVersion = await jsext.func(async (defer) => {
     *      const file = await fs.open("./package.json", "r");
     *      defer(() => file.close());
     *
     *      const content = await file.readFile("utf8");
     *      const pkg = JSON.parse(content);
     *
     *      return pkg.version as string;
     *  });
     */
    func<T, R = any, A extends any[] = any[]>(
        fn: (this: T, defer: (cb: () => void) => void, ...args: A) => R
    ): (this: T, ...args: A) => R;

    /**
     * Wraps a function inside another function and returns a new function
     * that copies the original function's name and properties.
     */
    wrap<T, Fn extends (this: T, ...args: any[]) => any>(
        fn: Fn,
        wrapper: (this: T, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>
    ): Fn;

    /**
     * Creates a throttled function that will only be run once in a certain amount of time.
     * 
     * If a subsequent call happens within the `duration`, the previous result will be returned and
     * the `handler` function will not be invoked.
     */
    throttle<T, Fn extends (this: T, ...args: any[]) => any>(handler: Fn, duration: number): Fn;
    throttle<T, Fn extends (this: T, ...args: any[]) => any>(handler: Fn, options: {
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

    /**
     * Returns an extended class that combines all mixin methods.
     * 
     * This function does not mutates the base class but create a pivot class
     * instead.
     */
    mixins<T extends Constructor<any>, M extends any[]>(
        base: T,
        ...mixins: { [X in keyof M]: Constructor<M[X]> }
    ): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;
    mixins<T extends Constructor<any>, M extends any[]>(
        base: T,
        ...mixins: M
    ): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;

    /**
     * Wraps a source as an AsyncIterable object that can be used in the `for...await...` loop
     * for reading streaming data.
     */
    read<I extends AsyncIterable<any>>(iterable: I): I;
    read(es: EventSource, options?: { event?: string; }): AsyncIterable<string>;
    read<T extends Uint8Array | string>(ws: WebSocket): AsyncIterable<T>;
    read<T>(target: EventTarget, eventMap?: {
        message?: string;
        error?: string;
        close?: string;
    }): AsyncIterable<T>;
    read<T>(target: NodeJS.EventEmitter, eventMap?: {
        data?: string;
        error?: string;
        close?: string;
    }): AsyncIterable<T>;

    /**
     * Runs a task in the `script` in a worker thread that can be aborted during runtime.
     * 
     * In Node.js, the `script` is relative to the `process.cwd()` if not absolute.
     * 
     * In browser, if the `script` is not an absolute path, there could be two situations:
     *  1. If the worker entry file is loaded normally (with `content-type: application/json`), the
     *      `script` is relative to the current page.
     *  2. If the worker is loaded with an object URL (the content-type of the entry file isn't
     *      `application/json`), the `script` will be relative to the root directory of the URL.
     * 
     * So it would be better to just set an absolute path and prevent unnecessary headache.
     */
    run<T, A extends any[] = any[]>(script: string, args?: A, options?: {
        /** If not set, runs the default function, otherwise runs the specific function. */
        fn?: string;
        /** Automatically abort the task when timeout (in milliseconds). */
        timeout?: number;
        /**
         * Instead of dropping the worker after the task has completed, keep it alive so that it can
         * be reused by other tasks.
         */
        keepAlive?: boolean;
        /**
         * In browser, this option is ignored and will always use the web worker.
         */
        adapter?: "worker_threads" | "child_process";
        /**
         * In browser, by default, the program loads the worker entry directly from GitHub, which
         * could be slow due to poor internet connection, we can copy the entry file
         * `esm/worker-web.mjs` to a local path of our website and set this option to that path so
         * that it can be loaded locally.
         */
        webWorkerEntry?: string;
    }): Promise<{
        workerId: number;
        /** Terminates the worker and abort the task. */
        abort(): Promise<void>;
        /** Retrieves the return value of the function. */
        result(): Promise<T>;
        /** Iterates the yield value if the function returns a generator. */
        iterate(): AsyncIterable<T>;
    }>;
}

const jsext: JsExt = {
    try(fn: any, ...args: any[]) {
        if (typeof fn === "function") {
            try {
                return jsext.try(fn.apply(void 0, args));
            } catch (err) {
                return [err, undefined];
            }
        }

        let returns = fn;
        // Implementation details should be ordered from complex to simple.

        if (isAsyncGenerator(returns)) {
            return (async function* () {
                let input: unknown;
                let result: any;

                // Use `while` loop instead of `for...of...` in order to
                // retrieve the return value of a generator function.
                while (true) {
                    try {
                        let { done, value } = await returns.next(input);

                        if (done) {
                            result = value;
                            break;
                        } else {
                            // Receive any potential input value that passed
                            // to the outer `next()` call, and pass them to
                            // `res.next()` in the next call.
                            input = yield Promise.resolve([null, value]);
                        }
                    } catch (err) {
                        // If any error occurs, yield that error as resolved
                        // and break the loop immediately, indicating the
                        // process is forced broken.
                        yield Promise.resolve([err, undefined]);
                        break;
                    }
                }

                return Promise.resolve([null, result]);
            })() as AsyncGenerator<unknown, any, unknown>;
        } else if (isGenerator(returns)) {
            return (function* () {
                let input: unknown;
                let result: any;

                while (true) {
                    try {
                        let { done, value } = returns.next(input);

                        if (done) {
                            result = value;
                            break;
                        } else {
                            input = yield [null, value];
                        }
                    } catch (err) {
                        yield [err, undefined];
                        break;
                    }
                }

                return [null, result];
            })() as Generator<unknown, any, unknown>;
        } else if (typeof returns?.then === "function") {
            returns = (returns as PromiseLike<any>).then((value: any) => [null, value]);
            return Promise.resolve(returns).catch((err: unknown) => [err, undefined]) as any;
        } else {
            return [null, returns];
        }
    },
    func<T, R = any, A extends any[] = any[]>(
        fn: (this: T, defer: (cb: () => void) => void, ...args: A) => R
    ): (this: T, ...args: A) => R {
        return function (this: any, ...args: A) {
            const callbacks: (() => void)[] = [];
            const defer = (cb: () => void) => void callbacks.push(cb);
            type Result = { value?: Awaited<R>; error: unknown; };
            let result: Result | undefined;

            try {
                const returns = fn.call(this, defer, ...args) as any;

                if (isAsyncGenerator(returns)) {
                    const gen = (async function* () {
                        let input: unknown;

                        // Use `while` loop instead of `for...of...` in order to
                        // retrieve the return value of a generator function.
                        while (true) {
                            try {
                                let { done, value } = await returns.next(input);

                                if (done) {
                                    result = { value, error: null };
                                    break;
                                } else {
                                    // Receive any potential input value that passed
                                    // to the outer `next()` call, and pass them to
                                    // `res.next()` in the next call.
                                    input = yield Promise.resolve(value);
                                }
                            } catch (error) {
                                // If any error occurs, capture that error and break
                                // the loop immediately, indicating the process is
                                // forced broken.
                                result = { value: void 0, error } as Result;
                                break;
                            }
                        }

                        for (let i = callbacks.length - 1; i >= 0; i--) {
                            await (callbacks[i] as () => void | Promise<void>)?.();
                        }

                        if (result.error) {
                            throw result.error;
                        } else {
                            return Promise.resolve(result.value);
                        }
                    })() as AsyncGenerator<unknown, any, unknown>;

                    return gen as R;
                } else if (isGenerator(returns)) {
                    const gen = (function* () {
                        let input: unknown;

                        while (true) {
                            try {
                                let { done, value } = returns.next(input);

                                if (done) {
                                    result = { value, error: null };
                                    break;
                                } else {
                                    input = yield value;
                                }
                            } catch (error) {
                                result = { value: void 0, error } as Result;
                                break;
                            }
                        }

                        for (let i = callbacks.length - 1; i >= 0; i--) {
                            callbacks[i]?.();
                        }

                        if (result.error) {
                            throw result.error;
                        } else {
                            return result.value;
                        }
                    })() as Generator<unknown, R, unknown>;

                    return gen as R;
                } else if (typeof returns?.then === "function") {
                    return Promise.resolve(returns as PromiseLike<R>).then(value => ({
                        value,
                        error: null,
                    } as Result)).catch((error: unknown) => ({
                        value: void 0,
                        error,
                    } as Result)).then(async result => {
                        for (let i = callbacks.length - 1; i >= 0; i--) {
                            await (callbacks[i] as () => void | Promise<void>)?.();
                        }

                        if (result.error) {
                            throw result.error;
                        } else {
                            return result.value;
                        }
                    }) as R;
                } else {
                    result = { value: returns, error: null } as Result;
                }
            } catch (error) {
                result = { value: void 0, error } as Result;
            }

            for (let i = callbacks.length - 1; i >= 0; i--) {
                callbacks[i]?.();
            }

            if (result.error) {
                throw result.error;
            } else {
                return result.value as R;
            }
        };
    },
    wrap<T, Fn extends (this: T, ...args: any[]) => any>(
        fn: Fn,
        wrapper: (this: T, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>
    ): Fn {
        const wrapped = function (this: any, ...args: Parameters<Fn>): ReturnType<Fn> {
            return wrapper.call(this, fn, ...args);
        };

        Object.defineProperty(wrapped,
            "name",
            Object.getOwnPropertyDescriptor(fn, "name") as PropertyDescriptor);
        Object.defineProperty(wrapped,
            "length",
            Object.getOwnPropertyDescriptor(fn, "length") as PropertyDescriptor);
        Object.defineProperty(wrapped, "toString", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: fn.toString.bind(fn),
        });

        return wrapped as Fn;
    },
    throttle(handler, options) {
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
    },
    mixins(base, ...mixins) {
        const obj = { ctor: null as any as Constructor<any> };
        obj.ctor = class extends (<any>base) { }; // make sure this class has no name

        for (let mixin of mixins) {
            if (typeof mixin == "function") {
                mergeHierarchy(obj.ctor, mixin);
            } else if (mixin && typeof mixin == "object") {
                mergeIfNotExists(obj.ctor.prototype, mixin);
            } else {
                throw new TypeError("mixin must be a constructor or an object");
            }
        }

        return obj.ctor as Constructor<any>;
    },
    read<T>(source: any, eventMap: {
        event?: string; // for EventSource custom event
        message?: string;
        data?: string;
        error?: string;
        close?: string;
    } | undefined = undefined): AsyncIterable<T> {
        if (typeof source[Symbol.asyncIterator] === "function") {
            return source;
        }

        const iterable = {
            ended: false,
            error: null as Error | null,
            queue: [] as T[],
            consumers: [] as {
                resolve: (data: IteratorResult<T>) => void;
                reject: (err: any) => void;
            }[],
            next() {
                return new Promise<IteratorResult<T>>((resolve, reject) => {
                    if (this.error && !this.ended) {
                        // If there is error occurred during the last transmission and the iterator
                        // hasn't been closed, reject that error and stop the iterator immediately.
                        reject(this.error);
                        this.ended = true;
                    } else if (this.ended && !this.queue.length) {
                        // If the iterator has is closed, resolve the pending consumer with void
                        // value.
                        resolve({ value: void 0 as T, done: true });
                    } else if (this.queue.length > 0) {
                        // If there are data in the queue, resolve the the first piece immediately.
                        resolve({ value: this.queue.shift() as T, done: false });
                    } else {
                        // If there are no queued data, push the consumer to a waiting queue.
                        this.consumers.push({ resolve, reject });
                    }
                });
            }
        };

        const handleMessage = (data: T) => {
            if (iterable.consumers.length > 0) {
                iterable.consumers.shift()?.resolve({ value: data, done: false });
            } else {
                iterable.queue.push(data);
            }
        };
        const handleClose = () => {
            iterable.ended = true;
            let consumer: typeof iterable["consumers"][0] | undefined;

            while (consumer = iterable.consumers.shift()) {
                consumer.resolve({ value: undefined, done: true });
            }
        };
        const handleError = (err: Error) => {
            iterable.error = err;

            if (iterable.consumers.length > 0) {
                iterable.consumers.forEach(item => {
                    item.reject(err);
                });
                iterable.consumers = [];
            }
        };
        const handleBrowserErrorEvent = (ev: Event) => {
            let err: Error;

            if (ev instanceof ErrorEvent) {
                err = ev.error || new Error(ev.message);
            } else {
                // @ts-ignore
                err = new Error("something went wrong", { cause: ev });
            }

            handleError(err);
        };

        const proto = Object.getPrototypeOf(source);
        const msgDesc = Object.getOwnPropertyDescriptor(proto, "onmessage");

        if (msgDesc?.set && typeof source.close === "function") { // WebSocket or EventSource
            const errDesc = Object.getOwnPropertyDescriptor(proto, "onerror");
            const closeDesc = Object.getOwnPropertyDescriptor(proto, "onclose");
            let cleanup: () => void;

            if (eventMap?.event &&
                eventMap?.event !== "message" &&
                typeof source["addEventListener"] === "function"
            ) { // for EventSource listening on custom events
                const es = source as EventSource;
                const eventName = eventMap.event;
                const msgListener = (ev: MessageEvent<T>) => {
                    handleMessage(ev.data);
                };

                es.addEventListener(eventName, msgListener);
                cleanup = () => {
                    es.removeEventListener(eventName, msgListener);
                };
            } else {
                msgDesc.set.call(source, (ev: MessageEvent<T>) => {
                    handleMessage(ev.data);
                });
                cleanup = () => {
                    msgDesc.set?.call(source, null);
                };
            }

            errDesc?.set?.call(source, handleBrowserErrorEvent);

            if (closeDesc?.set) { // WebSocket
                closeDesc.set.call(source, () => {
                    handleClose();
                    closeDesc.set?.call(source, null);
                    errDesc?.set?.call(source, null);
                    cleanup?.();
                });
            } else if (!closeDesc?.set && typeof source.close === "function") { // EventSource
                // EventSource by default does not trigger close event, we need to make sure when
                // it calls the close() function, the iterator is automatically closed.
                const es = source as EventSource;
                const _close = es.close;
                es.close = function close() {
                    _close.call(es);
                    handleClose();
                    es.close = _close;
                    errDesc?.set?.call(source, null);
                    cleanup?.();
                };
            }
        } else if (typeof source.send === "function" && typeof source.close === "function") {
            // non-standard WebSocket implementation
            const ws = source as WebSocket;
            ws.onmessage = (ev: MessageEvent<T>) => {
                handleMessage(ev.data);
            };
            ws.onerror = handleBrowserErrorEvent;
            ws.onclose = () => {
                handleClose();
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
            };
        } else if (typeof source["addEventListener"] === "function") { // EventTarget
            const target = source as EventTarget;
            const msgEvent = eventMap?.message || "message";
            const errEvent = eventMap?.error || "error";
            const closeEvent = eventMap?.close || "close";
            const msgListener = (ev: Event) => {
                if (ev instanceof MessageEvent) {
                    handleMessage(ev.data);
                }
            };

            target.addEventListener(msgEvent, msgListener);
            target.addEventListener(errEvent, handleBrowserErrorEvent);
            target.addEventListener(closeEvent, function closeListener() {
                handleClose();
                target.removeEventListener(closeEvent, closeListener);
                target.removeEventListener(msgEvent, msgListener);
                target.removeEventListener(errEvent, handleBrowserErrorEvent);
            });
        } else if (typeof source["on"] === "function") { // EventEmitter
            const target = source as NodeJS.EventEmitter;
            const dataEvent = eventMap?.data || "data";
            const errEvent = eventMap?.error || "error";
            const endEvent = eventMap?.close || "close";

            target.on(dataEvent, handleMessage);
            target.once(errEvent, handleError);
            target.once(endEvent, () => {
                handleClose();
                target.off(dataEvent, handleMessage);
                target.off(dataEvent, handleError);
            });
        } else {
            throw new TypeError("the input source cannot be read as an AsyncIterable object");
        }

        return {
            [Symbol.asyncIterator]() {
                return iterable;
            }
        };
    },
    async run(script, args = undefined, options = undefined) {
        const msg = {
            type: "ffi",
            script,
            fn: options?.fn || "default",
            args: args ?? [],
        };

        // `buffer` is used to store data pieces yielded by generator functions before they are
        // consumed. `error` and `result` serves similar purposes for function results.
        const buffer: any[] = [];
        let error: Error | null = null;
        let result: { value: any; } | undefined;
        let resolver: {
            resolve: (data: any) => void;
            reject: (err: unknown) => void;
        } | undefined;
        let iterator: NodeJS.EventEmitter | undefined;
        let workerId: number | undefined;
        let poolRecord: typeof workerPool[0] | undefined;
        let release: () => void;
        let terminate = () => Promise.resolve<void>(void 0);
        let timeout = options?.timeout ? setTimeout(() => {
            const err = new Error(`operation timeout after ${options.timeout}ms`);

            if (resolver) {
                resolver.reject(err);
            } else {
                error = err;
            }

            terminate();
        }, options.timeout) : null;

        const handleMessage = (msg: any) => {
            if (msg && typeof msg === "object" && typeof msg.type === "string") {
                if (msg.type === "error") {
                    return handleError(msg.error);
                } else if (msg.type === "return") {
                    if (options?.keepAlive) {
                        // Release before resolve.
                        release?.();

                        if (workerConsumerQueue.length) {
                            // Queued consumer now has chance to gain the worker.
                            workerConsumerQueue.shift()?.();
                        }
                    } else {
                        terminate();
                    }

                    if (resolver) {
                        resolver.resolve(msg.value);
                    } else {
                        result = { value: msg.value };
                    }
                } else if (msg.type === "yield") {
                    if (msg.done) {
                        // The final message of yield event is the return value.
                        handleMessage({ type: "return", value: msg.value });
                    } else {
                        if (iterator) {
                            iterator.emit("data", msg.value);
                        } else {
                            buffer.push(msg.value);
                        }
                    }
                }
            }
        };

        const handleError = (err: Error | null) => {
            if (resolver) {
                resolver.reject(err);
            } else if (iterator) {
                iterator.emit("error", err);
            } else {
                error = err;
            }
        };
        const handleExit = () => {
            if (poolRecord) {
                // Clean the pool before resolve.
                workerPool = workerPool.filter(record => record !== poolRecord);

                if (workerConsumerQueue.length) {
                    // Queued consumer now has chance to create new worker.
                    workerConsumerQueue.shift()?.();
                }
            }

            if (resolver) {
                resolver.resolve(void 0);
            } else if (iterator) {
                iterator.emit("close");
            } else if (!error && !result) {
                result = { value: void 0 };
            }
        };

        if (isNode) {
            const path = await import("path");
            const fs = await import("fs/promises");
            let _filename: string;
            let _dirname: string;
            let entry: string;

            if (typeof __filename === "string") {
                _filename = __filename;
                _dirname = __dirname;
            } else {
                // Using the ES module in Node.js is very unlikely, so we just check the module
                // filename in a simple manner, and report error if not found.
                let [err] = await jsext.try(fs.stat("package.json"));

                if (err) {
                    throw new Error("the current working directory is not a Node.js module");
                }

                _filename = process.cwd() + "/node_modules/@ayonli/jsext/esm/index.mjs";
                [err] = await jsext.try(fs.stat(_filename));

                if (err) {
                    // Assuming this is @ayonli/jsext itself.
                    _filename = process.cwd() + "/esm/index.mjs";
                    [err] = await jsext.try(fs.stat(_filename));

                    if (err) {
                        throw new Error("can not locate the worker entry");
                    }
                }

                _dirname = path.dirname(_filename);
            }

            if (_filename.endsWith(".js")) { // compiled
                entry = path.join(_dirname, "esm", "worker.mjs");
            } else {
                entry = path.join(path.dirname(_dirname), "esm", "worker.mjs");
            }

            if (options?.adapter === "child_process") {
                let worker: ChildProcess;
                poolRecord = workerPool.find(item => {
                    return item.adapter === "child_process" && !item.busy;
                });

                if (poolRecord) {
                    worker = poolRecord.worker as ChildProcess;
                    workerId = poolRecord.workerId;
                    poolRecord.busy = true;
                } else if (workerPool.length < maxWorkerNum) {
                    const { fork } = await import("child_process");
                    worker = fork(entry, { stdio: "inherit", serialization: "advanced" });
                    workerId = worker.pid as number;

                    // Fill the worker pool regardless the current call should keep-alive or not,
                    // this will make sure that the total number of workers will not exceed the
                    // maxWorkerNum. If the the call doesn't keep-alive the worker, it will be
                    // cleaned after the call.
                    workerPool.push(poolRecord = {
                        workerId,
                        worker,
                        adapter: "child_process",
                        busy: true,
                    });
                } else {
                    // Put the current call in the consumer queue if there are no workers available,
                    // once an existing call finishes, the queue will pop the its head consumer and
                    // retry.
                    return new Promise<void>((resolve) => {
                        workerConsumerQueue.push(resolve);
                    }).then(() => jsext.run(script, args, options));
                }

                release = () => {
                    // Remove the event listener so that later calls will not mess up.
                    worker.off("message", handleMessage);
                    poolRecord && (poolRecord.busy = false);
                };
                terminate = () => Promise.resolve(void worker.kill(1));

                worker.send(msg);
                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("exit", handleExit);
            } else {
                let worker: NodeWorker;
                poolRecord = workerPool.find(item => {
                    return item.adapter === "worker_threads" && !item.busy;
                });

                if (poolRecord) {
                    worker = poolRecord.worker as NodeWorker;
                    workerId = poolRecord.workerId;
                    poolRecord.busy = true;
                } else if (workerPool.length < maxWorkerNum) {
                    const { Worker } = await import("worker_threads");
                    worker = new Worker(entry);
                    workerId = worker.threadId;
                    workerPool.push(poolRecord = {
                        workerId,
                        worker,
                        adapter: "worker_threads",
                        busy: true,
                    });
                } else {
                    return new Promise<void>((resolve) => {
                        workerConsumerQueue.push(resolve);
                    }).then(() => jsext.run(script, args, options));
                }

                release = () => {
                    worker.off("message", handleMessage);
                    poolRecord && (poolRecord.busy = false);
                };
                terminate = async () => void (await worker.terminate());

                worker.postMessage(msg);
                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("messageerror", handleError);
                worker.once("exit", handleExit);
            }
        } else {
            let worker: Worker;
            poolRecord = workerPool.find(item => {
                return item.adapter === "worker_threads" && !item.busy;
            });

            if (poolRecord) {
                worker = poolRecord.worker as Worker;
                workerId = poolRecord.workerId;
                poolRecord.busy = true;
            } else if (workerPool.length < maxWorkerNum) {
                const url = options?.webWorkerEntry
                    || "https://raw.githubusercontent.com/ayonli/jsext/main/esm/worker-web.mjs";
                const res = await fetch(url);
                let _url: string;

                if (res.headers.get("content-type")?.startsWith("application/javascript")) {
                    _url = url;
                } else {
                    // GitHub returns MIME type `text/plain` for the file, we need to change it to
                    // `application/javascript`, by creating a new blob a with custom type and using
                    // URL.createObjectURL() to create a `blob:` URL for the resource so that it can
                    // be loaded by the Worker constructor.
                    //
                    // NOTE: a blob URL will cause the `location.href` in the worker alway points to
                    // the blob URL instead of the current page.
                    const buf = await res.arrayBuffer();
                    const blob = new Blob([new Uint8Array(buf)], { type: "application/javascript" });
                    _url = URL.createObjectURL(blob);
                }

                worker = new Worker(_url, { type: "module" });
                workerId = workerIdCounter.next().value as number;
                workerPool.push(poolRecord = {
                    workerId,
                    worker,
                    adapter: "worker_threads",
                    busy: true,
                });
            } else {
                return new Promise<void>((resolve) => {
                    workerConsumerQueue.push(resolve);
                }).then(() => jsext.run(script, args, options));
            }

            release = () => {
                worker.onmessage = null;
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => {
                await Promise.resolve(worker.terminate());
                handleExit();
            };

            worker.postMessage(msg);
            worker.onmessage = (ev) => handleMessage(ev.data);
            worker.onerror = (ev) => handleMessage(ev.error || new Error(ev.message));
            worker.onmessageerror = () => {
                handleError(new Error("unable to deserialize the message"));
            };
        }

        return {
            workerId,
            async abort() {
                timeout && clearTimeout(timeout);
                await terminate();
            },
            async result() {
                return await new Promise<any>((resolve, reject) => {
                    if (error) {
                        reject(error);
                    } else if (result) {
                        resolve(result.value);
                    } else {
                        resolver = { resolve, reject };
                    }
                });
            },
            async *iterate() {
                if (resolver) {
                    throw new Error("result() has been called");
                } else if (result) {
                    throw new TypeError("the response is not iterable");
                }

                const { EventEmitter } = await import("events");
                iterator = new EventEmitter();

                if (buffer.length) {
                    (async () => {
                        await Promise.resolve(null);
                        let msg: any;

                        while (msg = buffer.shift()) {
                            iterator.emit("data", msg);
                        }
                    })().catch(console.error);
                }

                for await (const msg of jsext.read<any>(iterator)) {
                    yield msg;
                }
            },
        };
    }
};

export default jsext;
