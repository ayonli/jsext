import { TypedArray } from './types.js';
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
    var _c;
    const proto = Object.getPrototypeOf(obj);
    if (!proto || !hasOwn(proto, method)) {
        return false;
    }
    return typeof ((_c = Object.getOwnPropertyDescriptor(proto, method)) === null || _c === void 0 ? void 0 : _c.value) === "function";
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
    var _c, _d;
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
        return (_d = (_c = Object.getPrototypeOf(value)) === null || _c === void 0 ? void 0 : _c.constructor) !== null && _d !== void 0 ? _d : Object;
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
function compare(a, b) {
    if (typeof a !== typeof b) {
        throw new TypeError("Cannot compare values of different types");
    }
    else if (typeof a === "string") {
        return a.localeCompare(b);
    }
    else if (typeof a === "number") {
        if (Object.is(a, NaN) || Object.is(b, NaN)) {
            throw new TypeError("Cannot compare NaN");
        }
        return a === b ? 0 : a < b ? -1 : 1;
    }
    else if (typeof a === "bigint") {
        return a === b ? 0 : a < b ? -1 : 1;
    }
    else if (typeof a === "boolean") {
        return a === b ? 0 : a ? 1 : -1;
    }
    else if (typeof a !== "object" || a === null) {
        throw new TypeError("Cannot compare values of non-comparable types");
    }
    else if (typeof a.compareTo === "function" && typeof b.compareTo === "function") {
        if (isPlainObject(a) && isPlainObject(b)) {
            const aKeys = Reflect.ownKeys(a);
            const bKeys = Reflect.ownKeys(b);
            if (aKeys.every(k => k in b) && bKeys.every(k => k in a)) {
                return a.compareTo(b);
            }
            else {
                throw new TypeError("Cannot compare values of different types");
            }
        }
        else if (a.constructor === b.constructor) {
            return a.compareTo(b);
        }
        else if (a.constructor && b instanceof a.constructor) {
            return a.compareTo(b);
        }
        else if (b.constructor && a instanceof b.constructor) {
            const result = b.compareTo(a);
            return result === 0 ? 0 : -result;
        }
        else {
            throw new TypeError("Cannot compare values of different types");
        }
    }
    else if (typeof a[Symbol.toPrimitive] === "function"
        && typeof b[Symbol.toPrimitive] === "function") {
        const _a = a[Symbol.toPrimitive]("number");
        const _b = b[Symbol.toPrimitive]("number");
        if (typeof _a !== "number" || Object.is(_a, NaN)) {
            throw new TypeError("The first value cannot be coerced to a number");
        }
        else if (typeof _b !== "number" || Object.is(_b, NaN)) {
            throw new TypeError("The second value cannot be coerced to a number");
        }
        else {
            return compare(_a, _b);
        }
    }
    else if (typeof a.valueOf === "function" && typeof b.valueOf === "function") {
        const _a = a.valueOf();
        const _b = b.valueOf();
        if (typeof _a !== "number" || Object.is(_a, NaN)) {
            throw new TypeError("The first value cannot be coerced to a number");
        }
        else if (typeof _b !== "number" || Object.is(_b, NaN)) {
            throw new TypeError("The second value cannot be coerced to a number");
        }
        else {
            return compare(_a, _b);
        }
    }
    else {
        throw new TypeError("Cannot compare values of non-comparable types");
    }
}
/**
 * Performs a deep comparison between two values to see if they are equivalent.
 *
 * - Primitive values, `null`, and circular references are compared using the
 *   `Object.is` function.
 * - `String`, `Number` and `Boolean` object wrappers are coerced to their
 *   primitive values before comparison.
 * - Plain objects are compared by their own enumerable properties, unless they
 *   implement the {@link Comparable} interface.
 * - For non-plain objects, their `constructor`s must be the same to be considered
 *   potentially equal, unless they implement the {@link Comparable} interface.
 * - Arrays and Typed Arrays are compared one by one by their indexes, if there
 *   are other enumerable properties, they are compared as well.
 * - For `RegExp` instances, the `source`, `flags` and `lastIndex` properties are
 *   compared.
 * - The `name`, `message`, `stack`, `cause`, and `errors` properties of `Error`
 *   instances are always compared, if there are other enumerable properties,
 *   they are compared as well.
 * - `Map` and `Set` items are compared unordered, if there are other enumerable
 *   properties, they are compared as well.
 * - Objects that implements the {@link Comparable} interface are compared using
 *   the `compareTo` method.
 * - Objects that implements the `Symbol.toPrimitive("number")` or `valueOf(): number`
 *   method are coerced to numbers before comparing.
 * - In others cases, values are compared using the `Object.is` function.
 *
 * NOTE: This function does not distinguish `{}` and `Object.create(null)` they're
 * treated as equal as plain objects.
 *
 * @example
 * ```ts
 * import { equals } from "@ayonli/jsext/object";
 *
 * console.log(equals("Hello", "Hello")); // true
 * console.log(equals(42, 42)); // true
 * console.log(equals([1, 2, 3], [1, 2, 3])); // true
 * console.log(equals({ foo: "bar" }, { foo: "bar" })); // true
 *
 * // deep comparison
 * console.log(equals(
 *     { foo: { bar: "baz" } },
 *     { foo: { bar: "baz" } }
 * )); // true
 * ```
 */
function equals(a, b) {
    return (function isEqual(a, b, parents = []) {
        if (a === b || Object.is(a, b)) {
            return true;
        }
        else if (typeof a !== typeof b) {
            return false;
        }
        else if (typeof a !== "object"
            || a === null
            || b === null
            || (parents.includes(a) && parents.includes(b))) {
            return Object.is(a, b);
        }
        else if (a.constructor === String) {
            return String(a) === String(b);
        }
        else if (a.constructor === Number) {
            return Number(a) === Number(b);
        }
        else if (a.constructor === Boolean) {
            return Boolean(a) === Boolean(b);
        }
        else if (typeof a.compareTo === "function" && typeof b.compareTo === "function") {
            try {
                return compare(a, b) === 0;
            }
            catch (_c) {
                return false;
            }
        }
        else if (isPlainObject(a) && isPlainObject(b)) {
            const _parents = [...parents, a, b];
            return Reflect.ownKeys(a).length === Reflect.ownKeys(b).length
                && Reflect.ownKeys(a).every(key => isEqual(a[key], b[key], _parents));
        }
        else if (a.constructor !== b.constructor) {
            return false;
        }
        else if (a instanceof Array || a instanceof TypedArray) {
            const _parents = [...parents, a, b];
            return a.length === b.length
                && a.every((value, i) => isEqual(value, b[i], _parents))
                && isEqual({ ...a }, { ...b }, _parents);
        }
        else if (a instanceof Error) {
            const { name: aName, message: aMessage, stack: aStack, cause: aCause, errors: aErrors, ...aRest } = a;
            const { name: bName, message: bMessage, stack: bStack, cause: bCause, errors: bErrors, ...bRest } = b;
            return aName === bName
                && aMessage === bMessage
                && aStack === bStack
                && isEqual(aCause, bCause, [...parents, a, b])
                && isEqual(aErrors, bErrors, [...parents, a, b])
                && isEqual(aRest, bRest, [...parents, a, b]);
        }
        else if (a instanceof RegExp) {
            const { source: aSource, flags: aFlags, lastIndex: aLastIndex, ...aRest } = a;
            const { source: bSource, flags: bFlags, lastIndex: bLastIndex, ...bRest } = b;
            return aSource === bSource
                && aFlags === bFlags
                && aLastIndex === bLastIndex
                && isEqual(aRest, bRest, [...parents, a, b]);
        }
        else if (a instanceof Map) {
            const _parents = [...parents, a, b];
            return a.size === b.size
                && [...a].every(([key, value]) => isEqual(value, b.get(key), _parents))
                && isEqual({ ...a }, { ...b }, _parents);
        }
        else if (a instanceof Set) {
            return a.size === b.size
                && [...a].every(value => b.has(value))
                && isEqual({ ...a }, { ...b }, [...parents, a, b]);
        }
        else {
            try {
                return compare(a, b) === 0;
            }
            catch (_d) {
                return Object.is(a, b);
            }
        }
    })(a, b);
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
    var _c;
    const maxDepth = depth;
    const carrier = obj.constructor ? {} : Object.create(null);
    const flatArrayIndices = (_c = options === null || options === void 0 ? void 0 : options.flatArrayIndices) !== null && _c !== void 0 ? _c : false;
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

export { as, compare, equals, filterEntries, flatKeys, hasOwn, hasOwnMethod, invert, isPlainObject, isValid, mapEntries, omit, partitionEntries, patch, pick, sanitize, sortKeys, typeOf };
//# sourceMappingURL=object.js.map
