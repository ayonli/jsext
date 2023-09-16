/// <reference types="node" />
export interface Constructor<T> extends Function {
    new (...args: any[]): T;
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
export interface JsExt {
    /**
     * Runs a function and catches any error happens inside it, returns the error and result
     * in a `[err, res]` tuple.
     */
    try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(fn: (...args: A) => AsyncGenerator<T, TReturn, TNext>, ...args: A): AsyncGenerator<[E | null, T], [E | null, TReturn], TNext>;
    try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(fn: (...args: A) => Generator<T, TReturn, TNext>, ...args: A): Generator<[E | null, T], [E | null, TReturn], TNext>;
    try<E = Error, R = any, A extends any[] = any[]>(fn: (...args: A) => Promise<R>, ...args: A): Promise<[E | null, R]>;
    try<E = Error, R = any, A extends any[] = any[]>(fn: (...args: A) => R, ...args: A): [E | null, R];
    /** Resolves a generator and renders its yield value in a `[err, val]` tuple. */
    try<E = Error, T = any, TReturn = any, TNext = unknown>(gen: AsyncGenerator<T, TReturn, TNext>): AsyncGenerator<[E | null, T], [E | null, TReturn], TNext>;
    try<E = Error, T = any, TReturn = any, TNext = unknown>(gen: Generator<T, TReturn, TNext>): Generator<[E | null, T], [E | null, TReturn], TNext>;
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
    func<T, R = any, A extends any[] = any[]>(fn: (this: T, defer: (cb: () => void) => void, ...args: A) => R): (this: T, ...args: A) => R;
    /**
     * Wraps a function inside another function and returns a new function
     * that copies the original function's name and properties.
     */
    wrap<T, Fn extends (this: T, ...args: any[]) => any>(fn: Fn, wrapper: (this: T, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>): Fn;
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
    mixins<T extends Constructor<any>, M extends any[]>(base: T, ...mixins: {
        [X in keyof M]: Constructor<M[X]>;
    }): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;
    mixins<T extends Constructor<any>, M extends any[]>(base: T, ...mixins: M): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>;
    /**
     * Wraps a source as an AsyncIterable object that can be used in the `for...await...` loop
     * for reading streaming data.
     */
    read<I extends AsyncIterable<any>>(iterable: I): I;
    read(es: EventSource, options?: {
        event?: string;
    }): AsyncIterable<string>;
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
     * In Node.js, the `script` can be either a CommonJS module or an ES module, and is relative to
     * the `process.cwd()` if not absolute.
     *
     * In browser, the `script` can only be an ES module, if it's not an absolute path, there could
     * be two situations:
     *
     * 1. If the worker entry file is loaded normally (with `content-type: application/json`), the
     *      `script` is relative to the current page.
     * 2. If the worker is loaded with an object URL (the content-type of the entry file isn't
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
declare const jsext: JsExt;
export default jsext;
