/**
 * Returns `true` if the specified object has the indicated property as its own property.
 * If the property is inherited, or does not exist, the function returns `false`.
 */
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
/**
 * Returns `true` if the specified object has the indicated method as its own method (in its own
 * prototype). If the method is inherited, or is not in the prototype, or does not exist, this
 * function returns `false`.
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
 */
function isPlainObject(value) {
    if (typeof value !== "object" || value === null)
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto.constructor === Object;
}
function sanitize(obj, options = false) {
    const deep = typeof options === "object" ? !!options.deep : !!options;
    const removeNull = typeof options === "object" ? !!options.removeNull : false;
    const removeEmptyString = typeof options === "object" ? !!options.removeEmptyString : false;
    const removeEmptyObject = typeof options === "object" ? !!(options === null || options === void 0 ? void 0 : options.removeEmptyObject) : false;
    return (function process(target, removeNull, removeEmptyString, removeEmptyObject, depth) {
        if (typeof target === "string") {
            return target.trim();
        }
        else if (Array.isArray(target)) {
            return !depth || deep ? target.map(item => process(item, removeNull, removeEmptyString, removeEmptyObject, depth + 1)).filter(item => {
                if (item === null) {
                    return !removeNull;
                }
                else if (item === "") {
                    return !removeEmptyString;
                }
                else if (Array.isArray(item)) {
                    return item.length > 0 || !removeEmptyObject;
                }
                else if (isPlainObject(item)) {
                    return Reflect.ownKeys(item).length > 0 || !removeEmptyObject;
                }
                else {
                    return true;
                }
            }) : target;
        }
        else if (isPlainObject(target)) {
            return !depth || deep ? Reflect.ownKeys(target).reduce((result, key) => {
                const value = process(target[key], removeNull, removeEmptyString, removeEmptyObject, depth + 1);
                if (value === null) {
                    if (!removeNull) {
                        result[key] = value;
                    }
                }
                else if (value === "") {
                    if (!removeEmptyString) {
                        result[key] = value;
                    }
                }
                else if (isValid(value)) {
                    if (typeof value !== "object") {
                        result[key] = value;
                    }
                    else if (Array.isArray(value)) {
                        if (value.length > 0 || !removeEmptyObject) {
                            result[key] = value;
                        }
                    }
                    else if (isPlainObject(value)) {
                        if (Reflect.ownKeys(value).length > 0 || !removeEmptyObject) {
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
    })(obj, removeNull, removeEmptyString, removeEmptyObject, 0);
}
/**
 * Creates an object with sorted keys (in ascending order) of the original object.
 *
 * Note: symbol keys are not sorted and remain their original order.
 */
function sortKeys(obj, deep = false) {
    return (function process(target, depth) {
        if (isPlainObject(target)) {
            return !depth || deep ? [
                ...Object.getOwnPropertyNames(target).sort(),
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
 * @param depth Default value: `1`.
 * @example
 * ```ts
 * const obj = flatKeys({ foo: { bar: "hello", baz: "world" } });
 * console.log(obj);
 * // { "foo.bar": "hello", "foo.baz": "world" }
 * ```
 */
function flatKeys(obj, depth = 1) {
    return (function process(carrier, source, path, depth, maxDepth) {
        if (depth === maxDepth || !isPlainObject(source)) {
            carrier[path] = source;
        }
        else {
            Reflect.ownKeys(source).forEach(key => {
                const value = source[key];
                if (typeof key === "symbol") {
                    if (depth === 0) { // only allow top-level symbol properties
                        carrier[key] = value;
                    }
                }
                else {
                    process(carrier, value, path ? `${path}.${key}` : key, path ? depth + 1 : depth, maxDepth);
                }
            });
        }
        return carrier;
    })(obj.constructor ? {} : Object.create(null), obj, "", 0, depth);
}

export { as, flatKeys, hasOwn, hasOwnMethod, isPlainObject, isValid, omit, patch, pick, sanitize, sortKeys };
//# sourceMappingURL=index.js.map
