/**
 * Performs pipe operations through a series of functions upon a value.
 * @module
 */

const _value = Symbol.for("value");

/**
 * Pipe holds a value and allows you chain operations upon it (and the result of
 * the previous operation) to get the final result, similar to the Unix pipe
 * operator `|` in shell scripting.
 */
export class Pipe<T> {
    private [_value]: T;

    constructor(value: T) {
        this[_value] = value;
    }

    /**
     * Calls a function upon the current value and returns a new {@link Pipe}
     * instance that holds the result.
     */
    thru<R, A extends any[] = any[]>(fn: (value: T, ...args: A) => R, ...args: A): Pipe<R> {
        return new Pipe(fn(this[_value], ...args));
    }

    /**
     * Returns the current value.
     */
    valueOf(): T {
        return this[_value];
    }

    /**
     * Returns the string representation of the current value.
     */
    toString(): string {
        return String(this[_value]);
    }
}

/**
 * Constructs a {@link Pipe} instance with the given value and performs pipe
 * operations upon it.
 * 
 * @example
 * ```ts
 * import pipe from "@ayonli/jsext/pipe";
 * 
 * const value = pipe("10")
 *     .thru(parseInt)
 *     .thru(Math.pow, 2)
 *     .thru(v => v.toFixed(2))
 *     .valueOf();
 * 
 * console.log(`the value is ${value}`) // the value is 100.00
 * ```
 */
export default function pipe<T>(value: T): Pipe<T> {
    return new Pipe(value);
}
