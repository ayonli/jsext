/**
 * Performs pipe operations through a series of functions upon a value.
 * @module
 */
const _value = Symbol.for("value");
/**
 * Pipeline holds a value and allows you chain operations upon it (and the result
 * of the previous operation) to get the final result, similar to the Unix pipe
 * operator `|` in shell scripting.
 */
class Pipeline {
    constructor(value) {
        this[_value] = value;
    }
    get [Symbol.toStringTag]() {
        return "Pipeline";
    }
    get value() {
        return this[_value];
    }
    /**
     * Calls a function using the current value as its argument and returns a
     * new {@link Pipeline} instance that holds the result.
     */
    pipe(fn, ...args) {
        return new Pipeline(fn(this[_value], ...args));
    }
    valueOf() {
        return this[_value];
    }
}
/**
 * Constructs a {@link Pipeline} instance with the given value and performs pipe
 * operations upon it.
 *
 * @example
 * ```ts
 * import pipe from "@ayonli/jsext/pipe";
 *
 * const { value } = pipe("10")
 *     .pipe(parseInt)
 *     .pipe(Math.pow, 2)
 *     .pipe(v => v.toFixed(2));
 *
 * console.log(`the value is ${value}`) // the value is 100.00
 * ```
 */
function pipe(value) {
    return new Pipeline(value);
}

export { Pipeline, pipe as default };
//# sourceMappingURL=pipe.js.map
