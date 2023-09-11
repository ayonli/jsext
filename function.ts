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
