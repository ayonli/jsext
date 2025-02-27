/**
 * This module provides the {@link Result} type that represents the result of
 * an operation that may succeed or fail, similar to the `Result` type in Rust,
 * but with a more JavaScript-friendly API and removes unnecessary boilerplate.
 * 
 * This module also provides the {@link Ok} and {@link Err} functions as
 * shorthands for constructing successful and failed results, respectively. Also,
 * a {@link Result.wrap} function is provided to wrap a traditional function
 * that may throw an error into a function that always returns a `Result` object.
 * 
 * This module don't give up the error propagation mechanism in JavaScript, we
 * can still use the `try...catch` statement to catch the error and handle it in
 * a traditional way. Which is done by using the `unwrap()` method of the
 * `Result` object to retrieve the value directly. Then we can use the
 * {@link Result.wrap} or {@link Result.try} to wrap the caller function if we
 * want it to return a `Result` as well.
 * 
 * @experimental
 * @module
 */
import { MethodDecorator } from "./class/decorators.ts";
import wrap from "./wrap.ts";

export interface IResult<T, E> {
    /**
     * Whether the result is successful.
     */
    readonly ok: boolean;
    /**
     * Returns the value if the result is successful, otherwise throws the error,
     * unless the error is handled and a fallback value is provided.
     * 
     * @param onError Handles the error and provides a fallback value.
     */
    unwrap(onError?: ((error: E) => T) | undefined): T;
    /**
     * Returns the value if the result is successful, otherwise returns
     * `undefined`.
     */
    optional(): T | undefined;
}

export interface ResultOk<T, E> extends IResult<T, E> {
    readonly ok: true;
    /**
     * The value of the result if `ok` is `true`.
     */
    readonly value: T;
}

export interface ResultErr<T, E> extends IResult<T, E> {
    readonly ok: false;
    /**
     * The error of the result if `ok` is `false`.
     */
    readonly error: E;
}

export interface ResultStatic {
    /**
     * Safely invokes a function that may throw and wraps the result in a `Result`
     * object. If the returned value is already a `Result` object, it will be
     * returned as is.
     */
    try<T, E = unknown, A extends any[] = any[]>(fn: (...args: A) => Result<T, E>, ...args: A): Result<T, E>;
    try<T, E = unknown, A extends any[] = any[]>(fn: (...args: A) => Promise<Result<T, E>>, ...args: A): Promise<Result<T, E>>;
    try<R, E = unknown, A extends any[] = any[]>(fn: (...args: A) => Promise<R | never>, ...args: A): Promise<Result<R, E>>;
    try<R, E = unknown, A extends any[] = any[]>(fn: (...args: A) => R | never, ...args: A): Result<R, E>;
    /**
     * Resolves the promise's result in a `Result` object. If the fulfilled value
     * is already a `Result` object, it will be resolved as is.
     */
    try<T, E = unknown>(promise: Promise<Result<T, E>>): Promise<Result<T, E>>;
    try<R, E = unknown>(promise: Promise<R | never>): Promise<Result<R, E>>;

    /**
     * Wraps a function that may throw and returns a new function that always
     * returns a `Result` object. If the returned value is already a `Result`
     * object, it will be returned as is.
     */
    wrap<A extends any[], T, E = unknown>(fn: (...args: A) => Result<T, E>): (...args: A) => Result<T, E>;
    wrap<A extends any[], T, E = unknown>(fn: (...args: A) => Promise<Result<T, E>>): (...args: A) => Promise<Result<T, E>>;
    wrap<A extends any[], R, E = unknown>(fn: (...args: A) => Promise<R | never>): (...args: A) => Promise<Result<R, E>>;
    wrap<A extends any[], R, E = unknown>(fn: (...args: A) => R | never): (...args: A) => Result<R, E>;
    /**
     * Used as a decorator, make sure a method always returns a `Result`
     * instance, even if it throws.
     */
    wrap(): MethodDecorator;
}

/**
 * Represents the result of an operation that may succeed or fail.
 * 
 * @example
 * ```ts
 * import { Result, Ok, Err } from "@ayonli/jsext/result";
 * 
 * function divide(a: number, b: number): Result<number, RangeError> {
 *     if (b === 0) {
 *         return Err(new RangeError("division by zero"));
 *     }
 * 
 *     return Ok(a / b);
 * }
 * 
 * const result = divide(10, 0);
 * if (result.ok) {
 *     console.log(result.value);
 * } else {
 *     console.error(result.error); // RangeError: division by zero
 * }
 * 
 * // safely propagate the error
 * function divAndSub(a: number, b: number): Result<number, RangeError> {
 *     return Result.try(() => {
 *         const value = divide(a, b).unwrap(); // This throws if b is 0, but
 *                                              // it will be caught and wrapped.
 *         return Ok(value - b);
 *     });
 * }
 * 
 * // wrap a function that may throw
 * const divAndSub2 = Result.wrap((a: number, b: number): Result<number, RangeError> => {
 *     const value = divide(a, b).unwrap(); // This throws if b is 0, but
 *                                          // it will be caught and wrapped.
 *     return Ok(value - b);
 * });
 * 
 * // use `wrap` as a decorator
 * class Calculator {
 *     \@Result.wrap()
 *     divAndSub(a: number, b: number): Result<number, RangeError> {
 *         const value = divide(a, b).unwrap(); // This throws if b is 0, but
 *                                              // it will be caught and wrapped.
 *         return Ok(value - b);
 *     }
 * }
 * 
 *
 * // Handle the error and provide a fallback value
 * const value = result.unwrap((error) => {
 *     console.error("An error occurred:", error);
 *     return 0;
 * });
 * console.log(value); // 0
 * 
 * // make the result optional
 * const value2 = result.optional();
 * console.log(value2); // undefined
 * ```
 */
export type Result<T, E = unknown> = ResultOk<T, E> | ResultErr<T, E>;
export const Result = function Result<T, E = unknown>(this: any, init: {
    ok: true,
    value: T;
} | {
    ok: false,
    error: E;
}) {
    if (!new.target) {
        throw new TypeError("Class constructor Result cannot be invoked without 'new'");
    }

    const ins = this as Result<T, E>;

    if (init.ok) {
        Object.defineProperties(ins, {
            ok: { value: true, enumerable: true },
            value: { value: init.value, enumerable: true },
        });
    } else {
        Object.defineProperties(ins, {
            ok: { value: false, enumerable: true },
            error: { value: init.error, enumerable: true },
        });
    }
} as unknown as {
    new <T, E = unknown>(init: { ok: true, value: T; }): Result<T, E>;
    new <T, E = unknown>(init: { ok: false, error: E; }): Result<T, E>;
    prototype: Result<unknown, unknown>;
} & ResultStatic;

Result.prototype.unwrap = function <T, E>(
    this: Result<T, E>,
    onError: ((error: E) => T) | undefined = undefined
) {
    if (this.ok) {
        return this.value;
    } else if (onError) {
        return onError(this.error);
    } else {
        throw this.error;
    }
};

Result.prototype.optional = function <T, E>(this: Result<T, E>) {
    return this.ok ? this.value : undefined;
};

Result.try = function (fn: ((...args: any[]) => any) | Promise<any>, ...args: any[]): any {
    if (typeof fn === "function") {
        try {
            const res = (fn as Function).call(void 0, ...args);

            if (typeof res?.then === "function") {
                return Result.try(res);
            } else {
                return res instanceof Result ? res : Ok(res);
            }
        } catch (error) {
            return Err(error);
        }
    } else {
        return Promise.resolve(fn)
            .then(value => value instanceof Result ? value : Ok(value))
            .catch(error => Err(error));
    }
};

Result.wrap = function (fn: ((...args: any[]) => any) | undefined = undefined): (...args: any[]) => any {
    if (typeof fn === "function") {
        return wrap(fn, function (this, fn, ...args) {
            try {
                const res = fn.call(this, ...args);

                if (typeof res?.then === "function") {
                    return Promise.resolve(res)
                        .then(value => value instanceof Result ? value : Ok(value))
                        .catch(error => Err(error));
                } else {
                    return res instanceof Result ? res : Ok(res);
                }
            } catch (error) {
                return Err(error);
            }
        });
    } else { // as a decorator
        return (...args: any[]) => {
            if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
                const [fn] = args as [(this: any, ...args: any[]) => any, DecoratorContext];
                return Result.wrap(fn);
            } else {
                const [_ins, _prop, desc] = args as [any, string, TypedPropertyDescriptor<any>];
                desc.value = Result.wrap(desc.value);
                return;
            }
        };
    }
};

/**
 * Constructs a successful result with the given value.
 */
export const Ok: <T, E = unknown>(value: T) => Result<T, E> = (value) => new Result({ ok: true, value });

/**
 * Constructs a failed result with the given error.
 */
export const Err: <E, T = never>(error: E) => Result<T, E> = (error) => new Result({ ok: false, error });
