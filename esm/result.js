import { setReadonly, getReadonly } from './class/util.js';
import wrap from './wrap.js';

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
class Result {
    constructor(result) {
        if (result.ok) {
            setReadonly(this, "ok", true);
            setReadonly(this, "value", result.value);
        }
        else {
            setReadonly(this, "ok", false);
            setReadonly(this, "error", result.error);
        }
    }
    /**
     * Whether the result is successful.
     */
    get ok() {
        return getReadonly(this, "ok");
    }
    /**
     * The value of the result if `ok` is `true`, otherwise throws the error if
     * `ok` is `false`, allowing the error to propagate.
     */
    get value() {
        if (!this.ok) {
            throw this.error;
        }
        return getReadonly(this, "value");
    }
    /**
     * The error of the result if `ok` is `false`, otherwise it is `undefined`.
     */
    get error() {
        return getReadonly(this, "error");
    }
    /**
     * Handles the result if failed, logs the error or provides a fallback value.
     */
    catch(fn) {
        return this.ok ? this.value : fn(this.error);
    }
    /**
     * Returns the value if the result is successful, otherwise returns
     * `undefined`.
     */
    optional() {
        return this.ok ? this.value : undefined;
    }
    /**
     * Constructs a successful result.
     */
    static ok(value) {
        return new Result({ ok: true, value });
    }
    /**
     * Constructs a failed result.
     */
    static err(error) {
        return new Result({ ok: false, error });
    }
    static wrap(fn = undefined) {
        if (typeof fn === "function") {
            try {
                const res = fn();
                if (typeof (res === null || res === void 0 ? void 0 : res.then) === "function") {
                    return Promise.resolve(res)
                        .then(value => value instanceof Result ? value : this.ok(value))
                        .catch(error => this.err(error));
                }
                else {
                    return res instanceof Result ? res : this.ok(res);
                }
            }
            catch (error) {
                return this.err(error);
            }
        }
        else { // as a decorator
            const _Result = this;
            return (...args) => {
                if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
                    const [fn] = args;
                    return wrap(fn, function (fn, ...args) {
                        return _Result.wrap(() => fn.call(this, ...args));
                    });
                }
                else {
                    const [_ins, _prop, desc] = args;
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
const Ok = Result.ok;
/**
 * A shorthand for `Result.err`.
 */
const Err = Result.err;

export { Err, Ok, Result };
//# sourceMappingURL=result.js.map
