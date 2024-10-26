/**
 * Decorator functions that can be used to validate the input and output of class
 * methods and guarantee type safety at runtime, include `param`, `returns` and
 * `throws`, based on [Zod](https://zod.dev).
 * @module
 */
import { z } from "zod";

const _source = Symbol.for("source");
const _params = Symbol.for("params");
const _returns = Symbol.for("returns");
const _throws = Symbol.for("throws");

export type MethodDecorator = {
    <T>(target: any, prop: string, desc: TypedPropertyDescriptor<T>): void | TypedPropertyDescriptor<T>;
    <F extends (...args: any[]) => any>(target: F, context: DecoratorContext): void | F;
};

function refinedError(err: any, ctorOpt: Function) {
    if (err instanceof z.ZodError) {
        let issue = err.issues[0]! as z.ZodIssue;

        if (issue.code === "invalid_union") {
            // report the first error encountered
            issue = issue.unionErrors[0]!.issues[0]! as any;
        }

        const path = issue.path.join(".");
        const _message = issue.message[0]!.toLowerCase() + issue.message.slice(1);
        const message = `validation failed at ${path}: `
            + _message.replace(/^input not instance\s/, "not an instance");

        // @ts-ignore cause is not available in new ECMA standard
        err = new TypeError(message, { cause: err });
        Error.captureStackTrace?.(err, ctorOpt);
    }

    return err;
}

function decorate(
    target: any,
    prop: string | undefined = void 0,
    desc: TypedPropertyDescriptor<any> | null = null
): (...arg: any[]) => any {
    const fn: (...arg: any[]) => any = desc ? desc.value : target;

    if (_source in fn) {
        return fn;
    }

    const originFn = fn;
    const fnName: string = prop
        || (typeof target === "function" ? target.name : "")
        || "anonymous";
    void fnName; // not used yet

    const newFn = (function (this: any, ...args: any[]) {
        const paramsDef = newFn[_params] as { type: z.ZodType; name?: string | undefined; }[] | undefined;
        const returnDef = newFn[_returns] as { type: z.ZodType; name: string; } | undefined;
        const throwDef = newFn[_throws] as { type: z.ZodType; name: string; } | undefined;

        if (paramsDef?.length) {
            const keyedArgs: { [name: string]: any; } = {};
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
            } catch (err) {
                throw refinedError(err, newFn);
            }

            args = Object.values(keyedArgs);
        }

        const handleError = (
            err: unknown,
            onrejected: ((...args: any[]) => any) | null = null
        ) => {
            if (err instanceof z.ZodError) {
                throw refinedError(err, onrejected ?? newFn);
            } else if (throwDef) {
                try {
                    err = throwDef.type.parse(err, { path: [throwDef.name] });
                } catch (_err) {
                    err = refinedError(_err, onrejected ?? newFn);
                }

                throw err;
            } else {
                throw err;
            }
        };

        try {
            let returns = originFn.apply(this, args);

            if (returnDef) {
                returns = returnDef.type.parse(returns, { path: [returnDef.name] });
            }

            if (returns && typeof returns === "object" && typeof returns.then === "function") {
                return Promise.resolve(returns).catch(function catcher(err: any) {
                    handleError(err, catcher);
                });
            } else {
                return returns;
            }
        } catch (err) {
            handleError(err);
        }
    }) as any;

    newFn[_source] = originFn;
    Object.defineProperty(newFn,
        "name",
        Object.getOwnPropertyDescriptor(originFn, "name") as PropertyDescriptor);
    Object.defineProperty(newFn,
        "length",
        Object.getOwnPropertyDescriptor(originFn, "length") as PropertyDescriptor);
    Object.defineProperty(newFn, "toString", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: originFn.toString.bind(originFn),
    });

    if (desc) {
        return (desc.value = newFn);
    } else {
        return newFn;
    }
};

/**
 * A decorator that restrains the input arguments of the method at runtime, based
 * on [Zod](https://zod.dev).
 * 
 * NOTE: Although this decorator accepts a parameter name, it is not bound to the
 * actually parameter in the method definition, it is only used for the error
 * message. The parameter is bound by the appearance order of the decorator.
 * 
 * @example
 * ```ts
 * import { param } from "@ayonli/jsext/decorators";
 * import { z } from "zod";
 * 
 * class Calculator {
 *     \@param("a", z.number())
 *     \@param("b", z.number())
 *     add(a: number, b: number) {
 *         return a + b;
 *     }
 * }
 * 
 * const calc = new Calculator();
 * // \@ts-ignore for demonstration
 * console.log(calc.add("2", 3));
 * // throws:
 * // TypeError: validation failed at parameter a: expected number, received string
 * ```
 */
export function param<T extends z.ZodType>(name: string, type: T): MethodDecorator;
export function param<T extends z.ZodType>(type: T): MethodDecorator;
export function param<T extends z.ZodType>(
    arg1: string | T,
    arg2: T | undefined = undefined
): MethodDecorator {
    let name: string | undefined;
    let type: T;

    if (typeof arg1 === "string") {
        name = arg1;
        type = arg2 as T;
    } else {
        name = undefined;
        type = arg1;
    }

    return (...args: any[]) => {
        if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
            const [target, context] = args as [Function, DecoratorContext];
            const fn = decorate(target, context.name as string) as any;
            const params = (fn[_params] ??= []) as { type: any; name?: string | undefined; }[];
            params.unshift({ type, name });

            return fn;
        } else {
            const [target, prop, desc] = args as [any, string, TypedPropertyDescriptor<any>];
            const fn = decorate(target, prop, desc) as any;
            const params = (fn[_params] ??= []) as { type: any; name?: string | undefined; }[];
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
 * import { returns } from "@ayonli/jsext/decorators";
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
 * import { returns } from "@ayonli/jsext/decorators";
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
export function returns<T extends z.ZodType>(type: T): MethodDecorator {
    return ((...args: any[]) => {
        if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
            const [target, context] = args as [Function, DecoratorContext];
            const fn = decorate(target, context.name as string) as any;
            fn[_returns] = { type, name: "return value" };

            return fn;
        } else {
            const [target, prop, desc] = args as [any, string, TypedPropertyDescriptor<any>];
            const fn = decorate(target, prop, desc) as any;
            fn[_returns] = { type, name: "return value" };

            return desc;
        }
    });
}

/**
 * A decorator that restrains the thrown value of the method.
 * 
 * @example
 * ```ts
 * import { throws } from "@ayonli/jsext/decorators";
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
export function throws<T extends z.ZodType>(type: T): MethodDecorator {
    return ((...args: any[]) => {
        if (typeof args[1] === "object") { // new ES decorator since TypeScript 5.0
            const [target, context] = args as [Function, DecoratorContext];
            const fn = decorate(target, context.name as string) as any;
            fn[_throws] = { type, name: "thrown value" };

            return fn;
        } else {
            const [target, prop, desc] = args as [any, string, TypedPropertyDescriptor<any>];
            const fn = decorate(target, prop, desc) as any;
            fn[_throws] = { type, name: "thrown value" };

            return desc ?? fn;
        }
    });
}
