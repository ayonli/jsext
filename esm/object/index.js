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

export { as, hasOwn, hasOwnMethod, isPlainObject, isValid, omit, patch, pick };
//# sourceMappingURL=index.js.map
