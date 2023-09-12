import { isGenerator, isAsyncGenerator } from "check-iterable";

declare global {
    interface FunctionConstructor {
        /**
         * Wraps a function inside another function and returns a new function
         * that copies the original function's name and properties.
         */
        wrap<T, Fn extends (this: T, ...args: any[]) => any>(
            fn: Fn,
            wrapper: (this: T, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>
        ): Fn;
        /**
         * Runs a function and catches any error happens inside it, returns the error and result
         * in a `[err, res]` tuple.
         */
        try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(
            fn: (...args: A) => AsyncGenerator<T, TReturn, TNext>,
            ...args: A
        ): AsyncGenerator<[E, T], [E, TReturn], TNext>;
        try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(
            fn: (...args: A) => Generator<T, TReturn, TNext>,
            ...args: A
        ): Generator<[E, T], [E, TReturn], TNext>;
        try<E = Error, R = any, A extends any[] = any[]>(
            fn: (...args: A) => Promise<R>,
            ...args: A
        ): Promise<[E, R]>;
        try<E = Error, R = any, A extends any[] = any[]>(
            fn: (...args: A) => R,
            ...args: A
        ): [E, R];
        /** Resolves a generator and renders its yield value in a `[err, val]` tuple. */
        try<E = Error, T = any, TReturn = any, TNext = unknown>(
            gen: AsyncGenerator<T, TReturn, TNext>
        ): AsyncGenerator<[E, T], [E, TReturn], TNext>;
        try<E = Error, T = any, TReturn = any, TNext = unknown>(
            gen: Generator<T, TReturn, TNext>
        ): Generator<[E, T], [E, TReturn], TNext>;
        /** Resolves a promise and returns the error and result in a `[err, res]` tuple. */
        try<E = Error, R = any>(job: Promise<R>): Promise<[E, R]>;
        /**
         * Inspired by Golang, creates a function that receives a `defer` function which can be used
         * to carry deferred jobs that will be run after the main function is complete.
         * 
         * Multiple calls of the `defer` function is supported, and the callbacks are called in the
         * LIFO order. Callbacks can be async functions if the main function is an async function or
         * an async generator function, and all the running procedures will be awaited.
         * 
         * @example
         *  const getVersion = await Function.useDefer(async (defer) => {
         *      const file = await fs.open("./package.json", "r");
         *      defer(() => file.close());
         *
         *      const content = await file.readFile("utf8");
         *      const pkg = JSON.parse(content);
         *
         *      return pkg.version as string;
         *  });
         */
        useDefer<T, R = any, A extends any[] = any[]>(
            fn: (this: T, defer: (cb: () => void) => void, ...args: A) => R
        ): (this: T, ...args: A) => R;
    }
}

Function.wrap = function <T extends (...args: any[]) => any>(
    fn: T,
    wrapper: (fn: T, ...args: Parameters<T>) => ReturnType<T>
) {
    const wrapped = function (this: any, ...args: Parameters<T>): ReturnType<T> {
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

    return wrapped as T;
};

function handleTry(returns: any) {
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
}

Function.try = function (fn: any, ...args: any[]) {
    if (typeof fn === "function") {
        try {
            return handleTry(fn.apply(void 0, args));
        } catch (err) {
            return [err, undefined];
        }
    } else {
        return handleTry(fn);
    }
};

Function.useDefer = function <E, R, A extends any[]>(
    fn: (defer: (cb: () => void) => void, ...args: A) => any
) {
    return function (this: any, ...args: A) {
        const callbacks: (() => void)[] = [];
        const defer = (cb: () => void) => void callbacks.push(cb);
        type Result = { value?: Awaited<R>; error: E | null; };
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
};
