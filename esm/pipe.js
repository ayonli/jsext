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
class Pipe {
    constructor(value) {
        this[_value] = value;
    }
    /**
     * Calls a function upon the current value and returns a new {@link Pipe}
     * instance that holds the result.
     */
    thru(fn, ...args) {
        return new Pipe(fn(this[_value], ...args));
    }
    /**
     * Returns the current value.
     */
    valueOf() {
        return this[_value];
    }
    /**
     * Returns the string representation of the current value.
     */
    toString() {
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
function pipe(value) {
    return new Pipe(value);
}

export { Pipe, pipe as default };
//# sourceMappingURL=pipe.js.map
