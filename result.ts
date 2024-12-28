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
 * a traditional way. Which is done by accessing the `value` property of the
 * `Result` object directly without checking the `ok` property. Much like the
 * `?` operator in Rust, or the `try` expression in Zig and Swift. Although we
 * need to use the {@link Result.wrap} function if we want the caller function
 * to return a `Result` as well.
 * 
 * @experimental
 * @module
 */
import { MethodDecorator } from "./class/decorators.ts";
import { getReadonly, setReadonly } from "./class/util.ts";
import wrap from "./wrap.ts";

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
 *         const value = divide(a, b).value; // This throws if b is 0, but
 *                                           // it will be caught and wrapped.
 *         return Ok(value - b);
 *     });
 * }
 * 
 * // use `wrap` as a decorator
 * class Calculator {
 *     \@Result.wrap()
 *     divAndSub(a: number, b: number): Result<number, RangeError> {
 *         const value = divide(a, b).value; // This throws if b is 0, but
 *                                           // it will be caught and wrapped.
 *         return Ok(value - b);
 *     }
 * }
 * ```
 */
export class Result<T, E = unknown> {
    private constructor(result: {
        ok: true,
        value: T,
    } | {
        ok: false,
        error: E;
    }) {
        if (result.ok) {
            setReadonly(this, "ok", true);
            setReadonly(this, "value", result.value);
        } else {
            setReadonly(this, "ok", false);
            setReadonly(this, "error", result.error);
        }
    }

    /**
     * Whether the result is successful.
     */
    get ok(): boolean {
        return getReadonly(this, "ok") as boolean;
    }

    /**
     * The value of the result if `ok` is `true`, otherwise throws the error if
     * `ok` is `false`, allowing the error to propagate.
     */
    get value(): T {
        if (!this.ok) {
            throw this.error;
        }

        return getReadonly(this, "value") as T;
    }

    /**
     * The error of the result if `ok` is `false`, otherwise it is `undefined`.
     */
    get error(): E {
        return getReadonly(this, "error") as E;
    }

    /**
     * Handles the result if failed, logs the error or provides a fallback value.
     */
    catch(fn: (error: E) => T): T {
        return this.ok ? this.value : fn(this.error);
    }

    /**
     * Returns the value if the result is successful, otherwise returns
     * `undefined`.
     */
    optional(): T | undefined {
        return this.ok ? this.value : undefined;
    }

    /**
     * Constructs a successful result.
     */
    static ok<T, E = unknown>(value: T): Result<T, E> {
        return new Result({ ok: true, value });
    }

    /**
     * Constructs a failed result.
     */
    static err<E, T = never>(error: E): Result<T, E> {
        return new Result({ ok: false, error });
    }

    /**
     * Wraps a function that may throw and calls it, capturing the result into a
     * `Result` object. If the returned value is already a `Result` object, it
     * will be returned as is.
     */
    static wrap<T, E = unknown>(fn: () => Result<T, E>): Result<T, E>;
    static wrap<T, E = unknown>(fn: () => Promise<Result<T, E>>): Promise<Result<T, E>>;
    static wrap<T, E = unknown>(fn: () => Promise<T | never>): Promise<Result<T, E>>;
    static wrap<T, E = unknown>(fn: () => T | never): Result<T, E>;
    /**
     * Use as a decorator, make sure a method always returns a `Result` instance,
     * even if it throws.
     */
    static wrap(): MethodDecorator;
    static wrap(fn: (() => any) | undefined = undefined): any {
        if (typeof fn === "function") {
            try {
                const res = fn();

                if (typeof res?.then === "function") {
                    return Promise.resolve(res)
                        .then(value => value instanceof Result ? value : this.ok(value))
                        .catch(error => this.err(error));
                } else {
                    return res instanceof Result ? res : this.ok(res);
                }
            } catch (error) {
                return this.err(error);
            }
        } else { // as a decorator
            const _Result = this;
            return (...args: any[]) => {
                if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
                    const [fn] = args as [(this: any, ...args: any[]) => any, DecoratorContext];
                    return wrap(fn, function (this, fn, ...args) {
                        return _Result.wrap(() => fn.call(this, ...args));
                    });
                } else {
                    const [_ins, _prop, desc] = args as [any, string, TypedPropertyDescriptor<any>];
                    desc.value = wrap(desc.value, function (fn, ...args) {
                        return _Result.wrap(() => fn.call(this, ...args));
                    });
                    return;
                }
            };
        }
    }
}

/**
 * A shorthand for `Result.ok`.
 */
export const Ok = Result.ok;

/**
 * A shorthand for `Result.err`.
 */
export const Err = Result.err;
