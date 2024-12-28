/**
 * This module provides the {@link Result} type that represents the result of
 * an operation that may succeed or fail, similar to the `Result` type in Rust,
 * but with a more JavaScript-friendly API and removes unnecessary boilerplate.
 * 
 * This module also provides the {@link Ok} and {@link Err} functions as
 * shorthands for constructing successful and failed results, respectively. Also,
 * a {@link Result.wrap} function is provided to wrap a traditional function
 * that may throw an error into a `Result` object.
 * 
 * This module don't give up the error propagation mechanism in JavaScript, we
 * can still use the `try...catch` statement to catch the error and handle it in
 * a traditional way. Which is done by using the `unwrap()` method of the
 * `Result` object to retrieve the value directly. Then we can use the
 * {@link Result.wrap} function to wrap the caller function if we want it to
 * return a `Result` as well.
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
     * Wraps a function that may throw and calls it, capturing the result into a
     * `Result` object. If the returned value is already a `Result` object, it
     * will be returned as is.
     */
    wrap<T, E = unknown>(fn: () => Result<T, E>): Result<T, E>;
    wrap<T, E = unknown>(fn: () => Promise<Result<T, E>>): Promise<Result<T, E>>;
    wrap<T, E = unknown>(fn: () => Promise<T | never>): Promise<Result<T, E>>;
    wrap<T, E = unknown>(fn: () => T | never): Result<T, E>;
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
 * // propagate the error and wrap it into a Result object
 * function divAndSub(a: number, b: number): Result<number, RangeError> {
 *     return Result.wrap(() => {
 *         const value = divide(a, b).unwrap(); // This throws if b is 0, but
 *                                           // it will be caught and wrapped.
 *         return Ok(value - b);
 *     });
 * }
 * 
 * // use `wrap` as a decorator
 * class Calculator {
 *     \@Result.wrap()
 *     divAndSub(a: number, b: number): Result<number, RangeError> {
 *         const value = divide(a, b).unwrap(); // This throws if b is 0, but
 *                                           // it will be caught and wrapped.
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
export type Result<T, E> = ResultOk<T, E> | ResultErr<T, E>;
export const Result = function Result<T, E>(this: any, init: {
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
            ok: { value: true },
            value: { value: init.value },
        });
    } else {
        Object.defineProperties(ins, {
            ok: { value: false },
            error: { value: init.error },
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

Result.wrap = function (fn: (() => any) | undefined = undefined): any {
    if (typeof fn === "function") {
        try {
            const res = fn();

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
    } else { // as a decorator
        return (...args: any[]) => {
            if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
                const [fn] = args as [(this: any, ...args: any[]) => any, DecoratorContext];
                return wrap(fn, function (this, fn, ...args) {
                    return Result.wrap(() => fn.call(this, ...args));
                });
            } else {
                const [_ins, _prop, desc] = args as [any, string, TypedPropertyDescriptor<any>];
                desc.value = wrap(desc.value, function (fn, ...args) {
                    return Result.wrap(() => fn.call(this, ...args));
                });
                return;
            }
        };
    }
};

/**
 * Constructs a successful result with the given value.
 */
export const Ok = <T, E = unknown>(value: T) => new Result<T, E>({ ok: true, value });

/**
 * Constructs a failed result with the given error.
 */
export const Err = <E, T = never>(error: E) => new Result<T, E>({ ok: false, error });
