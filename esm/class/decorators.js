import { z } from 'zod';

/**
 * Decorator functions that can be used to validate the input and output of class
 * methods and guarantee type safety at runtime, include `param`, `returns` and
 * `throws`, based on [Zod](https://zod.dev).
 * @module
 */
const _source = Symbol.for("source");
const _params = Symbol.for("params");
const _returns = Symbol.for("returns");
const _throws = Symbol.for("throws");
function refinedError(err, ctorOpt) {
    var _a;
    if (err instanceof z.ZodError) {
        let issue = err.issues[0];
        if (issue.code === "invalid_union") {
            // report the first error encountered
            issue = issue.unionErrors[0].issues[0];
        }
        const path = issue.path.join(".");
        const _message = issue.message[0].toLowerCase() + issue.message.slice(1);
        const message = `validation failed at ${path}: `
            + _message.replace(/^input not instance of/, "not an instance of");
        // @ts-ignore cause is not available in new ECMA standard
        err = new TypeError(message, { cause: err });
        (_a = Error.captureStackTrace) === null || _a === void 0 ? void 0 : _a.call(Error, err, ctorOpt);
    }
    return err;
}
function decorate(target, prop = void 0, desc = null) {
    const fn = desc ? desc.value : target;
    if (_source in fn) {
        return fn;
    }
    const originFn = fn;
    prop
        || (typeof target === "function" ? target.name : "")
        || "anonymous";
    const newFn = (function (...args) {
        const paramsDef = newFn[_params];
        const returnDef = newFn[_returns];
        const throwDef = newFn[_throws];
        if (paramsDef === null || paramsDef === void 0 ? void 0 : paramsDef.length) {
            const keyedArgs = {};
            const params = paramsDef.map((item, index) => {
                const name = item.name || `arg${index}`;
                keyedArgs[name] = args[index];
                return { ...item, name };
            });
            for (let i = Object.keys(keyedArgs).length; i < args.length; i++) {
                keyedArgs[`arg${i}`] = args[i];
            }
            try {
                for (const { name, type } of params) {
                    keyedArgs[name] = type.parse(keyedArgs[name], {
                        path: ["parameter " + name],
                    });
                }
            }
            catch (err) {
                throw refinedError(err, newFn);
            }
            args = Object.values(keyedArgs);
        }
        const handleError = (err, onrejected = null) => {
            if (err instanceof z.ZodError) {
                throw refinedError(err, onrejected !== null && onrejected !== void 0 ? onrejected : newFn);
            }
            else if (throwDef) {
                try {
                    err = throwDef.type.parse(err, { path: [throwDef.name] });
                }
                catch (_err) {
                    err = refinedError(_err, onrejected !== null && onrejected !== void 0 ? onrejected : newFn);
                }
                throw err;
            }
            else {
                throw err;
            }
        };
        try {
            let returns = originFn.apply(this, args);
            if (returnDef) {
                returns = returnDef.type.parse(returns, { path: [returnDef.name] });
            }
            if (returns && typeof returns === "object" && typeof returns.then === "function") {
                return Promise.resolve(returns).catch(function catcher(err) {
                    handleError(err, catcher);
                });
            }
            else {
                return returns;
            }
        }
        catch (err) {
            handleError(err);
        }
    });
    newFn[_source] = originFn;
    Object.defineProperty(newFn, "name", Object.getOwnPropertyDescriptor(originFn, "name"));
    Object.defineProperty(newFn, "length", Object.getOwnPropertyDescriptor(originFn, "length"));
    Object.defineProperty(newFn, "toString", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: originFn.toString.bind(originFn),
    });
    if (desc) {
        return (desc.value = newFn);
    }
    else {
        return newFn;
    }
}
function param(arg1, arg2 = undefined) {
    let name;
    let type;
    if (typeof arg1 === "string") {
        name = arg1;
        type = arg2;
    }
    else {
        name = undefined;
        type = arg1;
    }
    return (...args) => {
        var _a, _b;
        if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
            const [target, context] = args;
            const fn = decorate(target, context.name);
            const params = ((_a = fn[_params]) !== null && _a !== void 0 ? _a : (fn[_params] = []));
            params.unshift({ type, name });
            return fn;
        }
        else {
            const [target, prop, desc] = args;
            const fn = decorate(target, prop, desc);
            const params = ((_b = fn[_params]) !== null && _b !== void 0 ? _b : (fn[_params] = []));
            params.unshift({ type, name });
            return desc;
        }
    };
}
/**
 * A decorator that restrains the return value of the method at runtime, based
 * on [Zod](https://zod.dev).
 *
 * @example
 * ```ts
 * // regular function
 * import { returns } from "@ayonli/jsext/class/decorators";
 * import { z } from "zod";
 *
 * class Calculator {
 *     \@returns(z.number())
 *     times(a: number, b: number) {
 *         return String(a * b);
 *     }
 * }
 *
 * const calc = new Calculator();
 * console.log(calc.times(2, 3));
 * // throws:
 * // TypeError: validation failed at return value: expected number, received string
 * ```
 *
 * @example
 * ```ts
 * // async function
 * import { returns } from "@ayonli/jsext/class/decorators";
 * import { z } from "zod";
 *
 * class Calculator {
 *     \@returns(z.promise(z.number()))
 *     async times(a: number, b: number) {
 *         await new Promise(resolve => setTimeout(resolve, 100));
 *         return String(a * b);
 *     }
 * }
 *
 * const calc = new Calculator();
 * console.log(await calc.times(2, 3));
 * // throws:
 * // TypeError: validation failed at return value: expected number, received string
 * ```
 */
function returns(type) {
    return ((...args) => {
        if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
            const [target, context] = args;
            const fn = decorate(target, context.name);
            fn[_returns] = { type, name: "return value" };
            return fn;
        }
        else {
            const [target, prop, desc] = args;
            const fn = decorate(target, prop, desc);
            fn[_returns] = { type, name: "return value" };
            return desc;
        }
    });
}
/**
 * A decorator that restrains the thrown value of the method at runtime, based
 * on [Zod](https://zod.dev).
 *
 * @example
 * ```ts
 * import { throws } from "@ayonli/jsext/class/decorators";
 * import { z } from "zod";
 *
 * class Calculator {
 *     \@throws(z.instanceof(RangeError))
 *     div(a: number, b: number) {
 *         if (b === 0) {
 *             throw new TypeError("division by zero");
 *         }
 *         return a / b;
 *     }
 * }
 *
 * const calc = new Calculator();
 * console.log(calc.div(2, 0));
 * // throws:
 * // TypeError: validation failed at thrown value: not an instance of RangeError
 * ```
 */
function throws(type) {
    return ((...args) => {
        if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
            const [target, context] = args;
            const fn = decorate(target, context.name);
            fn[_throws] = { type, name: "thrown value" };
            return fn;
        }
        else {
            const [target, prop, desc] = args;
            const fn = decorate(target, prop, desc);
            fn[_throws] = { type, name: "thrown value" };
            return desc !== null && desc !== void 0 ? desc : fn;
        }
    });
}

export { param, returns, throws };
//# sourceMappingURL=decorators.js.map
