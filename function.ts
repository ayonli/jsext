import { isGenerator, isAsyncGenerator } from "check-iterable";

export { };

declare global {
    interface FunctionConstructor {
        /**
         * Wraps a function inside another function and returns a new function
         * that copies the original function's name and properties.
         */
        wrap<Fn extends (...args: any[]) => any>(
            fn: Fn,
            wrapper: (this: Function, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>
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
        res = res.then((value: any) => [null, value]);

        // There is no guarantee that a promise-like object's `then()`
        // method will always return a promise, to avoid any trouble, we
        // need to do one more check.
        if (typeof res?.catch === "function") {
            return res.catch((err: any) => [err, undefined]);
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
