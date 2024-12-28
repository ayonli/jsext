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
    ok: boolean;
    /**
     * Returns the value if the result is successful, otherwise throws the error.
     */
    unwrap(): T;
    /**
     * Handles the result if failed and provides a fallback value.
     */
    catch(fn: (error: E) => T): T;
    /**
     * Returns the value if the result is successful, otherwise returns
     * `undefined`.
     */
    optional(): T | undefined;
}

export interface ResultOk<T, E> extends IResult<T, E> {
    ok: true;
    /**
     * The value of the result if `ok` is `true`.
     */
    value: T;
}

export interface ResultErr<T, E> extends IResult<T, E> {
    ok: false;
    /**
     * The error of the result if `ok` is `false`.
     */
    error: E;
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
 * // provide a fallback value if failed
 * const value = result.catch(() => 0);
 * console.log(value); // 0
 * 
 * // make the result optional
 * const value2 = result.optional();
 * console.log(value2); // undefined
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
 * ```
 */
export type Result<T, E> = ResultOk<T, E> | ResultErr<T, E>;
export var Result = function Result<T, E>(this: any, result: {
    ok: true,
    value: T;
} | {
    ok: false,
    error: E;
}) {
    if (!new.target) {
        return new (Result as any)(result);
    }

    const ins = this as Result<T, E>;
    ins.ok = result.ok;

    if (result.ok) {
        (ins as ResultOk<T, E>).value = result.value;
    } else {
        (ins as ResultErr<T, E>).error = result.error;
    }
} as unknown as {
    prototype: Result<unknown, unknown>;
    <T, E = unknown>(result: { ok: true, value: T; }): Result<T, E>;
    <T, E = unknown>(result: { ok: false, error: E; }): Result<T, E>;
    new <T, E = unknown>(result: { ok: true, value: T; }): Result<T, E>;
    new <T, E = unknown>(result: { ok: false, error: E; }): Result<T, E>;
    wrap: {
        <T, E = unknown>(fn: () => Result<T, E>): Result<T, E>;
        <T, E = unknown>(fn: () => Promise<Result<T, E>>): Promise<Result<T, E>>;
        <T, E = unknown>(fn: () => Promise<T | never>): Promise<Result<T, E>>;
        <T, E = unknown>(fn: () => T | never): Result<T, E>;
        (): MethodDecorator;
    };
};

Result.prototype.unwrap = function <T, E>(this: Result<T, E>) {
    if (this.ok) {
        return (this as ResultOk<T, E>).value;
    } else {
        throw (this as ResultErr<T, E>).error;
    }
};

Result.prototype.catch = function <T, E>(this: Result<T, E>, fn: (error: E) => T) {
    if (this.ok) {
        return (this as ResultOk<T, E>).value;
    } else {
        return fn((this as ResultErr<T, E>).error);
    }
};

Result.prototype.optional = function <T, E>(this: Result<T, E>) {
    if (this.ok) {
        return (this as ResultOk<T, E>).value;
    } else {
        return undefined;
    }
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
