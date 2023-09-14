import { isAsyncGenerator, isGenerator } from "check-iterable";

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

    /** Runs a task in the script in a worker thread that can be aborted during runtime. */
    run<R, A extends any[] = any[]>(script: string, args?: A, options?: {
        /** If not set, runs the default function, otherwise runs the specific function. */
        fn?: string;
        /** Automatically abort when timeout (in milliseconds). */
        timeout?: number;
        /**
         * By default, type is automatically detected by the extension of the script (`.js` or
         * `.cjs` for CommonJS and `.mjs` for ES Module), but we can explicitly set this option to
         * `module` to treat a `.js` file as an ES Module.
         * 
         * In browser, this option is ignored and will always resolve to ES Module.
         */
        type?: "classic" | "module";
        /**
         * In browser, this option is ignored and will always use the web worker.
         */
        adapter?: "worker_threads" | "child_process";
    }): Promise<{
        abort(): Promise<void>;
        result(): Promise<R>;
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
        let result: { value: any; error: unknown; } | undefined;
        let resolver: {
            resolve: (data: any) => void;
            reject: (err: unknown) => void;
        } | undefined;
        let terminate = () => Promise.resolve<void>(void 0);
        let timeout = options?.timeout ? setTimeout(() => {
            const error = new Error(`operation timeout after ${options.timeout}ms`);

            if (resolver) {
                resolver.reject(error);
            } else {
                result = { value: void 0, error };
            }

            terminate();
        }, options.timeout) : null;

        const handleMessage = (msg: any) => {
            if (msg && typeof msg === "object" && msg.type === "result") {
                if (resolver) {
                    if (msg.error) {
                        resolver.reject(msg.error);
                    } else {
                        resolver.resolve(msg.value);
                    }
                } else {
                    result = { value: msg.value, error: msg.error };
                }

                terminate();
            }
        };
        const handleError = (error: unknown) => {
            if (resolver) {
                resolver.reject(error);
            } else {
                result = { value: void 0, error };
            }
        };
        const handleExit = (code: number | null) => {
            if (code) {
                handleError(new Error(`worker exited (code: ${code})`));
            } else {
                if (resolver) {
                    resolver.resolve(void 0);
                } else {
                    result = { value: void 0, error: null };
                }
            }
        };

        if (typeof process === "object" && process.versions?.node) {
            const path = await import("path");
            const esModule = options?.type === "module" || /\.(mjs|mts)$/.test(script);
            const entry = path.join(__dirname, esModule ? "worker.mjs" : "worker.cjs");

            if (options?.adapter === "child_process") {
                const { fork } = await import("child_process");
                const worker = fork(entry, {
                    stdio: "inherit",
                    serialization: "advanced",
                });
                terminate = () => Promise.resolve(void worker.kill(1));

                worker.send(msg);
                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("exit", handleExit);
            } else {
                const { Worker } = await import("worker_threads");
                const worker = new Worker(entry, { workerData: msg });
                terminate = async () => void (await worker.terminate());

                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("messageerror", handleError);
                worker.once("exit", handleExit);
            }
        } else {
            const worker = new Worker("/worker-web.mjs", { type: "module" });
            terminate = async () => {
                await Promise.resolve(worker.terminate());
                handleExit(1);
            };

            worker.postMessage(msg);
            worker.onmessage = (ev) => handleMessage(ev.data);
            worker.onerror = (ev) => handleMessage(ev.error || new Error(ev.message));
            worker.onmessageerror = () => {
                handleMessage(new Error("unable to deserialize the message"));
            };
        }

        return {
            async abort() {
                timeout && clearTimeout(timeout);
                await terminate();
            },
            async result() {
                return await new Promise<any>((resolve, reject) => {
                    if (result) {
                        if (result.error) {
                            reject(result.error);
                        } else {
                            resolve(result.value);
                        }
                    } else {
                        resolver = { resolve, reject };
                    }
                });
            },
        };
    }
};

export default jsext;
