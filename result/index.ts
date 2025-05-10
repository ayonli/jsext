/**
 * This module provides the {@link Result} type that represents the result of
 * an operation that may succeed or fail, similar to the `Result` type in Rust,
 * but with a more JavaScript-friendly API and removes unnecessary boilerplate.
 * 
 * This module provides a {@link try_} function (alias of {@link Result.try}) to
 * safely invoke a function that may throw and wraps the result in a `Result`
 * object.
 * 
 * This module also provides the {@link Ok} and {@link Err} functions as
 * shorthands for constructing successful and failed results, respectively. Also,
 * a {@link Result.wrap} function is provided to wrap a traditional function
 * that may throw an error into a function that always returns a `Result` object.
 * 
 * This module don't give up the error propagation mechanism in JavaScript, we
 * can still use the `try...catch` statement to catch the error and handle it in
 * a traditional way. Which is done by using the `unwrap()` method of the
 * `Result` object to retrieve the value directly.
 * 
 * @example
 * ```ts
 * // Safely invoke a function that may throw with `try_`.
 * import { try_ } from "@jsext/result";
 * 
 * function divide(a: number, b: number): number {
 *     if (b === 0) {
 *         throw new RangeError("division by zero");
 *     }
 * 
 *     return a / b;
 * }
 * 
 * const result = try_<number, RangeError>(() => divide(10, 0));
 * if (result.ok) {
 *     console.log("Result:", result.value);
 * } else {
 *     console.error("Error:", result.error.message);
 * }
 * ```
 * 
 * @example
 * ```ts
 * // Wrap a traditional function that may throw with `Result.wrap`.
 * import { Err, OK, Result } from "@jsext/result";
 * 
 * function divide(a: number, b: number): number {
 *     if (b === 0) {
 *         throw new RangeError("division by zero");
 *     }
 * 
 *      return a / b;
 * }
 * 
 * const safeDivide = Result.wrap(divide);
 * 
 * const result = safeDivide(10, 0);
 * if (result.ok) {
 *     console.log("Result:", result.value);
 * } else {
 *     console.error("Error:", result.error.message);
 * }
 * ```
 * 
 * @example
 * ```ts
 * // Define a class method that always returns a `Result` object.
 * import { Err, OK, Result } from "@jsext/result";
 * 
 * class Calculator {
 *     \@Result.wrap()
 *     divide(a: number, b: number): Result<number, RangeError> {
 *         if (b === 0) {
 *             return Err(new RangeError("division by zero"));
 *         }
 * 
 *         return Ok(a / b);
 *     }
 * }
 * 
 * const calc = new Calculator();
 * 
 * const result = calc.divide(10, 0);
 * if (result.ok) {
 *     console.log("Result:", result.value);
 * } else {
 *     console.error("Error:", result.error.message);
 * }
 * ```
 * 
 * @example
 * ```ts
 * // Use the `unwrap()` method to retrieve the value directly.
 * import { Err, OK, Result } from "@jsext/result";
 * 
 * function safeDivide(a: number, b: number): Result<number, RangeError> {
 *     if (b === 0) {
 *         return Err(new RangeError("division by zero"));
 *     }
 * 
 *     return Ok(a / b);
 * }
 * 
 * try {
 *     const value = safeDivide(10, 0).unwrap();
 *     console.log("Result:", value);
 * } catch (error) {
 *     console.error("Error:", (error as RangeError).message);
 * }
 * ```
 * 
 * @experimental
 * @module
 */
import { MethodDecorator } from "@jsext/types";
import _wrap from "@jsext/wrap";

export interface IResult<T, E> {
    /**
     * Whether the result is successful.
     */
    readonly ok: boolean;
    /**
     * The value of the result if `ok` is `true`.
     */
    value?: T | undefined;
    /**
     * The error of the result if `ok` is `false`.
     */
    error?: E | undefined;
    /**
     * Returns the value if the result is successful, otherwise throws the error,
     * unless the error is handled and a fallback value is provided.
     * 
     * @param onError Handles the error and provides a fallback value.
     * 
     *  * @example
     * ```ts
     * import { Err, OK, Result } from "@jsext/result";
     * 
     * function safeDivide(a: number, b: number): Result<number, RangeError> {
     *     if (b === 0) {
     *         return Err(new RangeError("division by zero"));
     *     }
     * 
     *     return Ok(a / b);
     * }
     * 
     * try {
     *     const value = safeDivide(10, 0).unwrap();
     *     console.log("Result:", value);
     * } catch (error) {
     *     console.error("Error:", (error as RangeError).message);
     * }
     * ```
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
    readonly value: T;
    readonly error?: undefined;
}

export interface ResultErr<T, E> extends IResult<T, E> {
    readonly ok: false;
    readonly error: E;
    readonly value?: undefined;
}

export interface ResultStatic {
    /**
     * Safely invokes a function that may throw and wraps the result in a `Result`
     * object. If the returned value is already a `Result` object, it will be
     * returned as is.
     * 
     * @example
     * ```ts
     * import { try_ } from "@jsext/result";
     * 
     * function divide(a: number, b: number): number {
     *     if (b === 0) {
     *         throw new RangeError("division by zero");
     *     }
     * 
     *     return a / b;
     * }
     * 
     * const result = try_<number, RangeError>(() => divide(10, 0));
     * if (result.ok) {
     *     console.log("Result:", result.value);
     * } else {
     *     console.error("Error:", result.error.message);
     * }
     * ```
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
     * 
     * @example
     * ```ts
     * import { Err, OK, Result } from "@jsext/result";
     * 
     * function divide(a: number, b: number): number {
     *     if (b === 0) {
     *         throw new RangeError("division by zero");
     *     }
     * 
     *      return a / b;
     * }
     * 
     * const safeDivide = Result.wrap(divide);
     * 
     * const result = safeDivide(10, 0);
     * if (result.ok) {
     *     console.log("Result:", result.value);
     * } else {
     *     console.error("Error:", result.error.message);
     * }
     * ```
     */
    wrap<A extends any[], T, E = unknown>(fn: (...args: A) => Result<T, E>): (...args: A) => Result<T, E>;
    wrap<A extends any[], T, E = unknown>(fn: (...args: A) => Promise<Result<T, E>>): (...args: A) => Promise<Result<T, E>>;
    wrap<A extends any[], R, E = unknown>(fn: (...args: A) => Promise<R | never>): (...args: A) => Promise<Result<R, E>>;
    wrap<A extends any[], R, E = unknown>(fn: (...args: A) => R | never): (...args: A) => Result<R, E>;
    /**
     * Used as a decorator, make sure a method always returns a `Result`
     * instance, even if it throws.
     * 
     * @example
     * ```ts
     * import { Err, OK, Result } from "@jsext/result";
     * 
     * class Calculator {
     *     \@Result.wrap()
     *     divide(a: number, b: number): Result<number, RangeError> {
     *         if (b === 0) {
     *             return Err(new RangeError("division by zero"));
     *         }
     * 
     *         return Ok(a / b);
     *     }
     * }
     * 
     * const calc = new Calculator();
     * 
     * const result = calc.divide(10, 0);
     * if (result.ok) {
     *     console.log("Result:", result.value);
     * } else {
     *     console.error("Error:", result.error.message);
     * }
     * ```
     */
    wrap(): MethodDecorator;
}

export type ResultLike<T, E = unknown> = {
    ok: true;
    value: T;
    error?: undefined;
} | {
    ok: false;
    error: E;
    value?: undefined;
};

/**
 * Represents the result of an operation that may succeed or fail.
 */
export type Result<T, E = unknown> = ResultOk<T, E> | ResultErr<T, E>;
export const Result = function Result<T, E = unknown>(this: any, init: ResultLike<T, E>) {
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
    new <T, E = unknown>(init: ResultLike<T, E>): Result<T, E>;
    prototype: Result<unknown, unknown>;
} & ResultStatic;

Result.prototype.unwrap = function unwrap<T, E>(
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

Result.prototype.optional = function optional<T, E>(this: Result<T, E>) {
    return this.ok ? this.value : undefined;
};

Result.try = function try_(fn: ((...args: any[]) => any) | Promise<any>, ...args: any[]): any {
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

Result.wrap = function wrap(fn: ((...args: any[]) => any) | undefined = undefined): (...args: any[]) => any {
    if (typeof fn === "function") {
        return _wrap(fn, function (this, fn, ...args) {
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

/**
 * A alias for {@link Result.try}.
 * 
 * @example
 * ```ts
 * import { try_ } from "@jsext/result";
 * 
 * function divide(a: number, b: number): number {
 *     if (b === 0) {
 *         throw new RangeError("division by zero");
 *     }
 * 
 *     return a / b;
 * }
 * 
 * const result = try_<number, RangeError>(() => divide(10, 0));
 * if (result.ok) {
 *     console.log("Result:", result.value);
 * } else {
 *     console.error("Error:", result.error.message);
 * }
 * ```
 */
export const try_ = Result.try;
