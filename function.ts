import { isGenerator, isAsyncGenerator } from "check-iterable";

export type DeferredCallback<E, R> = (result: {
    value?: Awaited<R>;
    error: E | null;
}) => R extends Promise<any> ? Promise<void> : void;

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
         * Inspired by Golang, creates a function that accepts a `defer` function which can be used to
         * carry deferred jobs that will be run after the main function is complete.
         * 
         * The deferred callback function receives an argument which is an object in the form of
         * `{ value, error }`, in which the `value` is the return value of the main function and the
         * `error` is the error happened during the call. Both properties can be modified in the
         * deferred callback, and the result (return / thrown value) of the main function will be
         * altered accordingly.
         * 
         * Multiple calls of the `defer` function is supported, and the callbacks are called in the
         * LIFO order. Callbacks can be async functions if the main function is an async function,
         * and the running procedures will all awaited.
         * 
         * @example
         *  const getVersion = await Function.withDefer(async (defer) => {
         *      const file = await fs.open("./package.json", "r");
         *      defer(() => file.close());
         *
         *      const content = await file.readFile("utf8");
         *      const pkg = JSON.parse(content);
         *
         *      return pkg.version as string;
         *  });
         */
        withDefer<T, E = Error, R = any, A extends any[] = any[]>(
            fn: (this: T, defer: (cb: DeferredCallback<E, R>) => void, ...args: A) => R
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

function handleTry(res: any) {
    // Implementation details should be ordered from complex to simple.

    if (isAsyncGenerator(res)) {
        return (async function* () {
            let input: any;
            let result: any;

            // Use `while` loop instead of `for...of...` in order to
            // retrieve the return value of a generator function.
            while (true) {
                try {
                    let {
                        done,
                        value
                    } = await (<AsyncIterableIterator<any>>res).next(input);

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
        })() as AsyncIterableIterator<any>;
    } else if (isGenerator(res)) {
        return (function* () {
            let input: any;
            let result: any;

            while (true) {
                try {
                    let {
                        done,
                        value
                    } = (<IterableIterator<any>>res).next(input);

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
        })() as IterableIterator<any>;
    } else if (typeof res?.then === "function") {
        res = (res as PromiseLike<any>).then((value: any) => [null, value]);

        // There is no guarantee that a promise-like object's `then()`
        // method will always return a promise, to avoid any trouble, we
        // need to do one more check.
        if (typeof res?.catch === "function") {
            return (res as Promise<any>).catch((err: unknown) => [err, undefined]);
        } else {
            return res;
        }
    } else {
        return [null, res];
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

Function.withDefer = function <E, R, A extends any[]>(
    fn: (defer: (cb: DeferredCallback<E, R>) => void, ...args: A) => any
) {
    return function (this: any, ...args: A) {
        const callbacks: DeferredCallback<E, R>[] = [];
        const defer = (cb: DeferredCallback<E, R>) => {
            callbacks.push(cb);
        };
        type Result = { value?: Awaited<R>; error: E | null; };
        let result: Result | undefined;

        try {
            const returns = fn.call(this, defer, ...args) as any;

            if (typeof returns?.["then"] === "function") {
                return Promise.resolve(returns as PromiseLike<R>).then(value => ({
                    value,
                    error: null,
                } as Result)).catch((error: unknown) => ({
                    value: void 0,
                    error,
                } as Result)).then(async result => {
                    for (let i = callbacks.length - 1; i >= 0; i--) {
                        await callbacks[i]?.(result);
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
        } catch (error: unknown) {
            result = { value: void 0, error } as Result;
        }

        for (let i = callbacks.length - 1; i >= 0; i--) {
            callbacks[i]?.(result);
        }

        if (result.error) {
            throw result.error;
        } else {
            return result.value as R;
        }
    };
};
