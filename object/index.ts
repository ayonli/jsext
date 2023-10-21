import type { Constructor } from "../index.ts";

/**
 * Returns `true` if the specified object has the indicated property as its own property.
 * If the property is inherited, or does not exist, the function returns `false`.
 */
export function hasOwn(obj: any, key: string | number | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
};

/**
 * Returns `true` if the specified object has the indicated method as its own method (in its own
 * prototype). If the method is inherited, or is not in the prototype, or does not exist, this
 * function returns `false`.
 */
export function hasOwnMethod(obj: any, method: string | symbol): boolean {
    const proto = Object.getPrototypeOf(obj);

    if (!proto || !hasOwn(proto, method)) {
        return false;
    }

    return typeof Object.getOwnPropertyDescriptor(proto, method)?.value === "function";
}

/**
 * Copies the key-value pairs that are presented in the source objects but are missing in
 * the target object into the target, later pairs are skipped if the same key already exists.
 * 
 * This function mutates the target object and returns it.
 */
export function patch<T extends {}, U>(target: T, source: U): T & U;
export function patch<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
export function patch<T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
export function patch(target: object, ...sources: any[]): any;
export function patch(target: any, ...sources: any[]) {
    for (const source of sources) {
        for (const key of Reflect.ownKeys(source)) {
            if (!hasOwn(target, key) || target[key] === undefined) {
                target[key] = source[key];
            }
        }
    }

    return target;
};

/** Creates an object composed of the picked keys. */
export function pick<T extends object, U extends keyof T>(obj: T, keys: U[]): Pick<T, U>;
export function pick<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
export function pick(obj: any, keys: (string | symbol)[]) {
    return keys.reduce((result: any, key: string | symbol) => {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key];
        }

        return result;
    }, {});
}

/**
 * Creates an object composed without the picked keys.
 * 
 * NOTE: this function only collect keys from the object's own properties, except for type
 * Error, whose `name`, `message` and `cause` are always collected.
 */
export function omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>;
export function omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
export function omit(obj: any, keys: (string | symbol)[]) {
    const allKeys = Reflect.ownKeys(obj);
    const keptKeys = allKeys.filter(key => !keys.includes(key));
    const result = pick(obj, keptKeys);

    // special treatment for Error types
    if (obj instanceof Error) {
        ["name", "message", "cause"].forEach(key => {
            if (!keys.includes(key) &&
                (obj as any)[key] !== undefined &&
                !hasOwn(result, key)
            ) {
                result[key] = (obj as any)[key];
            }
        });
    }

    return result;
}

/**
 * Checks if the value is an instance of the given type, returns the value itself if passed,
 * otherwise returns `null`. This function is mainly used for the optional chaining syntax.
 * @example
 * ```ts
 * as(bar, SomeType)?.doSomething();
 * ```
 */
export function as(value: unknown, type: StringConstructor): string | null;
export function as(value: unknown, type: NumberConstructor): number | null;
export function as(value: unknown, type: BigIntConstructor): bigint | null;
export function as(value: unknown, type: BooleanConstructor): boolean | null;
export function as(value: unknown, type: SymbolConstructor): symbol | null;
export function as<T>(value: unknown, type: Constructor<T>): T | null;
export function as(value: any, type: any): any {
    if (typeof type !== "function") {
        throw new TypeError("type must be a valid constructor");
    }

    let _type: any;
    const primitiveMap = <Record<string, Function>>{
        "string": String,
        "number": Number,
        "bigint": BigInt,
        "boolean": Boolean,
        "symbol": Symbol
    };

    if (value instanceof type) {
        if ([String, Number, Boolean].includes(type)) {
            return value.valueOf(); // make sure the primitives are returned.
        } else {
            return value;
        }
    } else if ((_type = typeof value) && primitiveMap[_type] === type) {
        return value;
    }

    return null;
}

/**
 * Returns `true` if the given value is valid. The following values are considered invalid:
 * 
 * - `undefined`
 * - `null`
 * - `NaN`
 * - `Invalid Date`
 */
export function isValid(value: unknown): boolean {
    return value !== undefined
        && value !== null
        && !Object.is(value, NaN)
        && !(value instanceof Date && value.toString() === "Invalid Date");
}

/**
 * Returns `true` is the given value is a plain object, that is, an object created by
 * the `Object` constructor or one with a `[[Prototype]]` of `null`.
 */
export function isPlainObject(value: unknown): value is { [x: string | symbol]: any; } {
    if (typeof value !== "object" || value === null)
        return false;

    const proto = Object.getPrototypeOf(value);
    return proto === null || proto.constructor === Object;
}
