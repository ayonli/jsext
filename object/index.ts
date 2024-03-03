import type { Constructor } from "../index.ts";
import isClass from "../isclass.ts";

/**
 * Returns `true` if the specified object has the indicated property as its own property.
 * If the property is inherited, or does not exist, the function returns `false`.
 */
export function hasOwn(obj: any, key: string | number | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

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
}

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
 * @remarks
 * This function only collect keys from the object's own properties, except for type Error,
 * whose `name`, `message` and `cause` are always collected.
 */
export function omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>;
export function omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
export function omit(obj: any, keys: (string | symbol)[]) {
    const allKeys = Reflect.ownKeys(obj);
    const keptKeys = allKeys.filter(key => !keys.includes(key));
    const result = pick(obj, keptKeys);

    // special treatment for Error types
    if (obj instanceof Error) {
        ["name", "message", "stack", "cause"].forEach(key => {
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
 * 
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

export type TypeNames = "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "function"
    | "class"
    | "undefined"
    | "null";

/**
 * Returns a string representation or the constructor of the value's type.
 * 
 * @remarks This function returns `"class"` for ES6 classes.
 * @remarks This function returns `"null"` for `null`.
 * @remarks This function returns `Object` for `Object.create(null)`.
 */
export function typeOf<T>(value: T): TypeNames | Constructor<T> {
    if (value === undefined) {
        return "undefined";
    } else if (value === null) {
        return "null";
    }

    const type = typeof value;

    if (type === "function") {
        return isClass(value) ? "class" : "function";
    } else if (type === "object") {
        return Object.getPrototypeOf(value)?.constructor as Constructor<T> ?? Object;
    } else {
        return type;
    }
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

/**
 * Creates an object base on the original object but without any invalid values
 * (except for `null`), and trims the value if it's a string.
 * 
 * @remarks This function only operates on plain objects and arrays.
 */
export function sanitize<T extends object>(obj: T, deep?: boolean): T;
export function sanitize<T extends object>(obj: T, options: {
    deep?: boolean,
    removeNulls?: boolean;
    removeEmptyStrings?: boolean;
    removeEmptyObjects?: boolean;
    removeArrayItems?: boolean;
}): T;
export function sanitize<T extends object>(obj: T, options: boolean | {
    deep?: boolean,
    removeNulls?: boolean;
    removeEmptyStrings?: boolean;
    removeEmptyObjects?: boolean;
    removeArrayItems?: boolean;
} = false): T {
    const deep = typeof options === "object" ? !!options.deep : !!options;
    const removeNulls = typeof options === "object" ? !!options.removeNulls : false;
    const removeEmptyStrings = typeof options === "object" ? !!options.removeEmptyStrings : false;
    const removeEmptyObjects = typeof options === "object" ? !!options?.removeEmptyObjects : false;
    const removeArrayItems = typeof options === "object" ? !!options?.removeArrayItems : false;

    return (function process(target: any, depth: number): any {
        if (typeof target === "string") {
            return target.trim();
        } else if (Array.isArray(target)) {
            const arr = !depth || deep ? target.map(item => process(item, depth + 1)) : target;

            if (removeArrayItems) {
                return arr.filter(value => {
                    if (value === null) {
                        return !removeNulls;
                    } else if (value === "") {
                        return !removeEmptyStrings;
                    } else if (isValid(value)) {
                        if (typeof value !== "object") {
                            return true;
                        } else if (Array.isArray(value)) {
                            return value.length > 0 || !removeEmptyObjects;
                        } else if (isPlainObject(value)) {
                            return Reflect.ownKeys(value).length > 0 || !removeEmptyObjects;
                        } else {
                            return true;
                        }
                    } else {
                        return false;
                    }
                });
            } else {
                return arr;
            }
        } else if (isPlainObject(target)) {
            return !depth || deep ? Reflect.ownKeys(target).reduce((result, key) => {
                const value = process(target[key], depth + 1);

                if (value === null) {
                    if (!removeNulls) {
                        result[key] = value;
                    }
                } else if (value === "") {
                    if (!removeEmptyStrings) {
                        result[key] = value;
                    }
                } else if (isValid(value)) {
                    if (typeof value !== "object") {
                        result[key] = value;
                    } else if (Array.isArray(value)) {
                        if (value.length > 0 || !removeEmptyObjects) {
                            result[key] = value;
                        }
                    } else if (isPlainObject(value)) {
                        if (Reflect.ownKeys(value).length > 0 || !removeEmptyObjects) {
                            result[key] = value;
                        }
                    } else {
                        result[key] = value;
                    }
                }

                return result;
            }, target.constructor ? {} as any : Object.create(null)) : target;
        } else {
            return target;
        }
    })(obj, 0);
}

/**
 * Creates an object with sorted keys (in ascending order) of the original object.
 * 
 * @remarks Symbol keys are not sorted and remain their original order.
 * @remarks This function only operates on plain objects and arrays.
 */
export function sortKeys<T extends object>(obj: T, deep = false): T {
    return (function process(target: any, depth: number): any {
        if (isPlainObject(target)) {
            return !depth || deep ? [
                ...Object.getOwnPropertyNames(target).sort(), // sort the string keys
                ...Object.getOwnPropertySymbols(target)
            ].reduce((result, key) => {
                result[key] = process(target[key], depth + 1);
                return result;
            }, target.constructor ? {} as any : Object.create(null)) : target;
        } else if (Array.isArray(target)) {
            return !depth || deep ? target.map(item => process(item, depth + 1)) : target;
        } else {
            return target;
        }
    })(obj, 0);
}

export type OmitChildrenNodes<T extends object> = Pick<T, {
    [K in keyof T]: T[K] extends any[] ? K : T[K] extends object ? never : K;
}[keyof T]>;

/**
 * Create an object with flatted keys of the original object, the children
 * nodes' properties will be transformed to a string-represented path.
 * 
 * @remarks This function only operates on plain objects and arrays.
 * 
 * @param depth Default value: `1`.
 * @example
 * ```ts
 * const obj = flatKeys({ foo: { bar: "hello", baz: "world" } });
 * console.log(obj);
 * // { "foo.bar": "hello", "foo.baz": "world" }
 * ```
 */
export function flatKeys<T extends object>(
    obj: T,
    depth = 1,
    options: { flatArrayIndices?: boolean; } = {}
): OmitChildrenNodes<T> & Record<string | number | symbol, any> {
    const maxDepth = depth;
    const carrier = obj.constructor ? {} as any : Object.create(null);
    const flatArrayIndices = options?.flatArrayIndices ?? false;

    if (!isPlainObject(obj) && (!Array.isArray(obj) || !flatArrayIndices)) {
        return obj;
    }

    (function process(target: any, path: string, depth: number) {
        if (depth === maxDepth) {
            carrier[path] = target;
        } else if (Array.isArray(target) && depth) {
            if (!flatArrayIndices) {
                carrier[path] = target;
            } else {
                target.forEach((value, i) => {
                    process(
                        value,
                        path ? `${path}.${i}` : String(i),
                        path ? depth + 1 : depth
                    );
                });
            }
        } else if (isPlainObject(target) || (Array.isArray(target) && !depth)) {
            Reflect.ownKeys(target).forEach(key => {
                const value = (target as any)[key];

                if (typeof key === "symbol") {
                    if (depth === 0) { // only allow top-level symbol properties
                        carrier[key] = value;
                    }
                } else {
                    process(
                        value,
                        path ? `${path}.${key}` : key,
                        path ? depth + 1 : depth
                    );
                }
            });
        } else {
            carrier[path] = target;
        }
    })(obj, "", 0);

    return carrier;
}
