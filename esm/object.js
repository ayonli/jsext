import { isClass } from './class.js';

/**
 * Functions for dealing with objects.
 * @module
 */
/**
 * Returns `true` if the specified object has the indicated property as its own property.
 * If the property is inherited, or does not exist, the function returns `false`.
 *
 * @example
 * ```ts
 * import { hasOwn } from "@ayonli/jsext/object";
 *
 * const obj = { foo: "hello" };
 *
 * console.log(hasOwn(obj, "foo")); // true
 * console.log(hasOwn(obj, "toString")); // false
 * ```
 */
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
/**
 * Returns `true` if the specified object has the indicated method as its own method (in its own
 * prototype). If the method is inherited, or is not in the prototype, or does not exist, this
 * function returns `false`.
 *
 * @example
 * ```ts
 * import { hasOwnMethod } from "@ayonli/jsext/object";
 *
 * class MyClass {
 *     foo() {
 *         return "Hello";
 *     }
 *
 *     bar = () => "World";
 * }
 *
 * const obj = new MyClass();
 *
 * console.log(hasOwnMethod(obj, "foo")); // true
 * console.log(hasOwnMethod(obj, "bar")); // false
 * console.log(hasOwnMethod(obj, "toString")); // false
 * ```
 */
function hasOwnMethod(obj, method) {
    var _a;
    const proto = Object.getPrototypeOf(obj);
    if (!proto || !hasOwn(proto, method)) {
        return false;
    }
    return typeof ((_a = Object.getOwnPropertyDescriptor(proto, method)) === null || _a === void 0 ? void 0 : _a.value) === "function";
}
function patch(target, ...sources) {
    for (const source of sources) {
        for (const key of Reflect.ownKeys(source)) {
            if (!hasOwn(target, key) || target[key] === undefined) {
                target[key] = source[key];
            }
        }
    }
    return target;
}
function pick(obj, keys) {
    return keys.reduce((result, key) => {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key];
        }
        return result;
    }, {});
}
function omit(obj, keys) {
    const allKeys = Reflect.ownKeys(obj);
    const keptKeys = allKeys.filter(key => !keys.includes(key));
    const result = pick(obj, keptKeys);
    // special treatment for Error types
    if (obj instanceof Error) {
        ["name", "message", "stack", "cause"].forEach(key => {
            if (!keys.includes(key) &&
                obj[key] !== undefined &&
                !hasOwn(result, key)) {
                result[key] = obj[key];
            }
        });
    }
    return result;
}
function as(value, type) {
    if (typeof type !== "function") {
        throw new TypeError("type must be a valid constructor");
    }
    let _type;
    const primitiveMap = {
        "string": String,
        "number": Number,
        "bigint": BigInt,
        "boolean": Boolean,
        "symbol": Symbol
    };
    if (value instanceof type) {
        if ([String, Number, Boolean].includes(type)) {
            return value.valueOf(); // make sure the primitives are returned.
        }
        else {
            return value;
        }
    }
    else if ((_type = typeof value) && primitiveMap[_type] === type) {
        return value;
    }
    return null;
}
/**
 * Returns a string representation or the constructor of the value's type.
 *
 * **NOTE:** This function returns `"class"` for ES6 classes.
 *
 * **NOTE:** This function returns `"null"` for `null`.
 *
 * **NOTE:** This function returns `Object` for `Object.create(null)`.
 *
 * @example
 * ```ts
 * import { typeOf } from "@ayonli/jsext/object";
 *
 * console.log(typeOf("Hello")); // string
 * console.log(typeOf(42)); // number
 * console.log(typeOf(42n)); // bigint
 * console.log(typeOf(true)); // boolean
 * console.log(typeOf(Symbol("foo"))); // symbol
 * console.log(typeOf(() => {})); // function
 * console.log(typeOf(class Foo {})); // class
 * console.log(typeOf(undefined)); // undefined
 * console.log(typeOf(null)); // null
 * console.log(typeOf({ foo: "bar" })); // [Function: Object]
 * console.log(typeOf(Object.create(null))); // [Function: Object]
 * console.log(typeOf([1, 2, 3])); // [Function: Array]
 * console.log(typeOf(new Date())); // [Function: Date]
 * ```
 */
function typeOf(value) {
    var _a, _b;
    if (value === undefined) {
        return "undefined";
    }
    else if (value === null) {
        return "null";
    }
    const type = typeof value;
    if (type === "function") {
        return isClass(value) ? "class" : "function";
    }
    else if (type === "object") {
        return (_b = (_a = Object.getPrototypeOf(value)) === null || _a === void 0 ? void 0 : _a.constructor) !== null && _b !== void 0 ? _b : Object;
    }
    else {
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
function isValid(value) {
    return value !== undefined
        && value !== null
        && !Object.is(value, NaN)
        && !(value instanceof Date && value.toString() === "Invalid Date");
}
/**
 * Returns `true` is the given value is a plain object, that is, an object created by
 * the `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @example
 * ```ts
 * import { isPlainObject } from "@ayonli/jsext/object";
 *
 * console.log(isPlainObject({ foo: "bar" })); // true
 * console.log(isPlainObject(Object.create(null))); // true
 * console.log(isPlainObject(new Map([["foo", "bar"]]))); // false
 * ```
 */
function isPlainObject(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto.constructor === Object;
}
/**
 * Creates an object base on the original object but without any invalid values
 * (except for `null`), and trims the value if it's a string.
 *
 * **NOTE:** This function only operates on plain objects and arrays.
 *
 * @example
 * ```ts
 * import { sanitize } from "@ayonli/jsext/object";
 *
 * const obj = sanitize({
 *     foo: "Hello",
 *     bar: "  World  ",
 *     baz: undefined,
 *     num: NaN,
 * });
 *
 * console.log(obj); // { foo: "Hello", bar: "World" }
 * ```
 */
function sanitize(obj, deep = false, options = {}) {
    const { removeNulls, removeEmptyStrings, removeEmptyObjects, removeArrayItems } = options;
    return (function process(target, depth) {
        if (typeof target === "string") {
            return target.trim();
        }
        else if (Array.isArray(target)) {
            const arr = !depth || deep ? target.map(item => process(item, depth + 1)) : target;
            if (removeArrayItems) {
                return arr.filter(value => {
                    if (value === null) {
                        return !removeNulls;
                    }
                    else if (value === "") {
                        return !removeEmptyStrings;
                    }
                    else if (isValid(value)) {
                        if (typeof value !== "object") {
                            return true;
                        }
                        else if (Array.isArray(value)) {
                            return value.length > 0 || !removeEmptyObjects;
                        }
                        else if (isPlainObject(value)) {
                            return Reflect.ownKeys(value).length > 0 || !removeEmptyObjects;
                        }
                        else {
                            return true;
                        }
                    }
                    else {
                        return false;
                    }
                });
            }
            else {
                return arr;
            }
        }
        else if (isPlainObject(target)) {
            return !depth || deep ? Reflect.ownKeys(target).reduce((result, key) => {
                const value = process(target[key], depth + 1);
                if (value === null) {
                    if (!removeNulls) {
                        result[key] = value;
                    }
                }
                else if (value === "") {
                    if (!removeEmptyStrings) {
                        result[key] = value;
                    }
                }
                else if (isValid(value)) {
                    if (typeof value !== "object") {
                        result[key] = value;
                    }
                    else if (Array.isArray(value)) {
                        if (value.length > 0 || !removeEmptyObjects) {
                            result[key] = value;
                        }
                    }
                    else if (isPlainObject(value)) {
                        if (Reflect.ownKeys(value).length > 0 || !removeEmptyObjects) {
                            result[key] = value;
                        }
                    }
                    else {
                        result[key] = value;
                    }
                }
                return result;
            }, target.constructor ? {} : Object.create(null)) : target;
        }
        else {
            return target;
        }
    })(obj, 0);
}
/**
 * Creates an object with sorted keys (in ascending order) of the original object.
 *
 * **NOTE:** Symbol keys are not sorted and remain their original order.
 *
 * **NOTE:** This function only operates on plain objects and arrays.
 *
 * @example
 * ```ts
 * import { sortKeys } from "@ayonli/jsext/object";
 *
 * const obj = sortKeys({ foo: "Hello", bar: "World" });
 *
 * console.log(JSON.stringify(obj)); // { "bar": "World", "foo": "Hello" }
 * ```
 */
function sortKeys(obj, deep = false) {
    return (function process(target, depth) {
        if (isPlainObject(target)) {
            return !depth || deep ? [
                ...Object.getOwnPropertyNames(target).sort(), // sort the string keys
                ...Object.getOwnPropertySymbols(target)
            ].reduce((result, key) => {
                result[key] = process(target[key], depth + 1);
                return result;
            }, target.constructor ? {} : Object.create(null)) : target;
        }
        else if (Array.isArray(target)) {
            return !depth || deep ? target.map(item => process(item, depth + 1)) : target;
        }
        else {
            return target;
        }
    })(obj, 0);
}
/**
 * Create an object with flatted keys of the original object, the children
 * nodes' properties will be transformed to a string-represented path.
 *
 * **NOTE:** This function only operates on plain objects and arrays.
 *
 * @param depth Default value: `1`.
 * @example
 * ```ts
 * import { flatKeys } from "@ayonli/jsext/object";
 *
 * const obj = flatKeys({ foo: { bar: "Hello", baz: "World" } });
 *
 * console.log(obj); // { "foo.bar": "Hello", "foo.baz": "World" }
 * ```
 */
function flatKeys(obj, depth = 1, options = {}) {
    var _a;
    const maxDepth = depth;
    const carrier = obj.constructor ? {} : Object.create(null);
    const flatArrayIndices = (_a = options === null || options === void 0 ? void 0 : options.flatArrayIndices) !== null && _a !== void 0 ? _a : false;
    if (!isPlainObject(obj) && (!Array.isArray(obj) || !flatArrayIndices)) {
        return obj;
    }
    (function process(target, path, depth) {
        if (depth === maxDepth) {
            carrier[path] = target;
        }
        else if (Array.isArray(target) && depth) {
            if (!flatArrayIndices) {
                carrier[path] = target;
            }
            else {
                target.forEach((value, i) => {
                    process(value, path ? `${path}.${i}` : String(i), path ? depth + 1 : depth);
                });
            }
        }
        else if (isPlainObject(target) || (Array.isArray(target) && !depth)) {
            Reflect.ownKeys(target).forEach(key => {
                const value = target[key];
                if (typeof key === "symbol") {
                    if (depth === 0) { // only allow top-level symbol properties
                        carrier[key] = value;
                    }
                }
                else {
                    process(value, path ? `${path}.${key}` : key, path ? depth + 1 : depth);
                }
            });
        }
        else {
            carrier[path] = target;
        }
    })(obj, "", 0);
    return carrier;
}
/**
 * Returns a new record with all entries of the given record except the ones
 * that do not match the given predicate.
 *
 * This function is effectively as
 * `Object.fromEntries(Object.entries(obj).filter(predicate))`.
 *
 * @example
 * ```ts
 * import { filterEntries } from "@ayonli/jsext/object";
 *
 * const obj = { foo: "Hello", bar: "World" };
 * const result = filterEntries(obj, ([key]) => key === "foo");
 *
 * console.log(result); // { foo: "Hello" }
 * ```
 */
function filterEntries(obj, predicate) {
    return Object.fromEntries(Object.entries(obj).filter(predicate));
}
/**
 * Applies the given transformer to all entries in the given record and returns
 * a new record containing the results.
 *
 * This function is effectively as
 * `Object.fromEntries(Object.entries(obj).map(transformer))`.
 *
 * @example
 * ```ts
 * import { mapEntries } from "@ayonli/jsext/object";
 *
 * const obj = { foo: "Hello", bar: "World" };
 * const result = mapEntries(obj, ([key, value]) => [key, value.toUpperCase()]);
 *
 * console.log(result); // { foo: "HELLO", bar: "WORLD" }
 * ```
 */
function mapEntries(obj, transformer) {
    return Object.fromEntries(Object.entries(obj).map(transformer));
}
/**
 * Returns a tuple of two records with the first one containing all entries of
 * the given record that match the given predicate and the second one containing
 * all that do not.
 *
 * @example
 * ```ts
 * import { partitionEntries } from "@ayonli/jsext/object";
 *
 * const obj = { foo: "Hello", bar: "World" };
 * const [match, rest] = partitionEntries(obj, ([key]) => key === "foo");
 *
 * console.log(match); // { foo: "Hello" }
 * console.log(rest); // { bar: "World" }
 * ```
 */
function partitionEntries(record, predicate) {
    const match = {};
    const rest = {};
    const entries = Object.entries(record);
    for (const [key, value] of entries) {
        if (predicate([key, value])) {
            match[key] = value;
        }
        else {
            rest[key] = value;
        }
    }
    return [match, rest];
}
/**
 * Composes a new record with all keys and values inverted.
 *
 * This function is effectively as
 * `Object.fromEntries(Object.entries(record).map(([key, value]) => [value, key]))`.
 *
 * @example
 * ```ts
 * import { invert } from "@ayonli/jsext/object";
 *
 * const obj = { foo: "Hello", bar: "World" };
 * const result = invert(obj);
 *
 * console.log(result); // { Hello: "foo", World: "bar" }
 * ```
 */
function invert(record) {
    return Object.fromEntries(Object.entries(record).map(([key, value]) => [value, key]));
}

export { as, filterEntries, flatKeys, hasOwn, hasOwnMethod, invert, isPlainObject, isValid, mapEntries, omit, partitionEntries, patch, pick, sanitize, sortKeys, typeOf };
//# sourceMappingURL=object.js.map
