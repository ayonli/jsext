import wrap from './wrap.js';

const Result = function Result(init) {
    if (!new.target) {
        throw new TypeError("Class constructor Result cannot be invoked without 'new'");
    }
    const ins = this;
    if (init.ok) {
        Object.defineProperties(ins, {
            ok: { value: true },
            value: { value: init.value },
        });
    }
    else {
        Object.defineProperties(ins, {
            ok: { value: false },
            error: { value: init.error },
        });
    }
};
Result.prototype.unwrap = function (onError = undefined) {
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
Result.prototype.optional = function () {
    return this.ok ? this.value : undefined;
};
Result.wrap = function (fn = undefined) {
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

export { Err, Ok, Result };
//# sourceMappingURL=result.js.map
