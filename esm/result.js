import wrap from './wrap.js';

const Result = function Result(init) {
    if (!new.target) {
        throw new TypeError("Class constructor Result cannot be invoked without 'new'");
    }
    const ins = this;
    if (init.ok) {
        Object.defineProperties(ins, {
            ok: { value: true, enumerable: true },
            value: { value: init.value, enumerable: true },
        });
    }
    else {
        Object.defineProperties(ins, {
            ok: { value: false, enumerable: true },
            error: { value: init.error, enumerable: true },
        });
    }
};
Result.prototype.unwrap = function unwrap(onError = undefined) {
    if (this.ok) {
        return this.value;
    }
    else if (onError) {
        return onError(this.error);
    }
    else {
        throw this.error;
    }
};
Result.prototype.optional = function optional() {
    return this.ok ? this.value : undefined;
};
Result.try = function try_(fn, ...args) {
    if (typeof fn === "function") {
        try {
            const res = fn.call(void 0, ...args);
            if (typeof (res === null || res === void 0 ? void 0 : res.then) === "function") {
                return Result.try(res);
            }
            else {
                return res instanceof Result ? res : Ok(res);
            }
        }
        catch (error) {
            return Err(error);
        }
    }
    else {
        return Promise.resolve(fn)
            .then(value => value instanceof Result ? value : Ok(value))
            .catch(error => Err(error));
    }
};
Result.wrap = function wrap$1(fn = undefined) {
    if (typeof fn === "function") {
        return wrap(fn, function (fn, ...args) {
            try {
                const res = fn.call(this, ...args);
                if (typeof (res === null || res === void 0 ? void 0 : res.then) === "function") {
                    return Promise.resolve(res)
                        .then(value => value instanceof Result ? value : Ok(value))
                        .catch(error => Err(error));
                }
                else {
                    return res instanceof Result ? res : Ok(res);
                }
            }
            catch (error) {
                return Err(error);
            }
        });
    }
    else { // as a decorator
        return (...args) => {
            if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
                const [fn] = args;
                return Result.wrap(fn);
            }
            else {
                const [_ins, _prop, desc] = args;
                desc.value = Result.wrap(desc.value);
                return;
            }
        };
    }
};
/**
 * Constructs a successful result with the given value.
 */
const Ok = (value) => new Result({ ok: true, value });
/**
 * Constructs a failed result with the given error.
 */
const Err = (error) => new Result({ ok: false, error });
/**
 * A alias for {@link Result.try}.
 *
 * @example
 * ```ts
 * import { try_ } from "@ayonli/jsext/result";
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
const try_ = Result.try;

export { Err, Ok, Result, try_ };
//# sourceMappingURL=result.js.map
