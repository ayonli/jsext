import { hasOwn } from './object/index.js';

/**
 * Checks if a value is a class/constructor.
 *
 * @example
 * ```ts
 * import { isClass } from "@ayonli/jsext/class";
 *
 * console.assert(isClass(class Foo { }));
 * console.assert(!isClass(function foo() { }));
 * ```
 */
function isClass(value) {
    if (typeof value !== "function")
        return false;
    if ([String, Number, Boolean, BigInt, Symbol].includes(value)) {
        return false;
    }
    // async function or arrow function
    if (value.prototype === undefined)
        return false;
    // generator function or malformed inheritance
    if (value.prototype.constructor !== value)
        return false;
    const str = value.toString();
    // ES6 class
    if (str.slice(0, 5) == "class")
        return true;
    const name0 = value.name[0];
    if (name0 && name0 >= "A" && name0 <= "Z" && str.includes("[native code]"))
        return true;
    return false;
}
/**
 * Checks if a class is a subclass of another class.
 *
 * @example
 * ```ts
 * import { isSubclassOf } from "@ayonli/jsext/class";
 *
 * class Moment extends Date {}
 *
 * console.assert(isSubclassOf(Moment, Date));
 * console.assert(isSubclassOf(Moment, Object)); // all classes are subclasses of Object
 * ```
 */
function isSubclassOf(ctor1, ctor2) {
    return typeof ctor1 === "function"
        && typeof ctor2 === "function"
        && ctor1.prototype instanceof ctor2;
}
/**
 * Merges properties and methods only if they're missing in the class.
 */
function mergeIfNotExists(proto, source, mergeSuper = false) {
    const props = Reflect.ownKeys(source);
    for (const prop of props) {
        if (prop == "constructor") {
            continue;
        }
        else if (mergeSuper) {
            // When merging properties from super classes, the properties in the
            // base class has the first priority and shall not be overwrite.
            if (!(prop in proto)) {
                setProp(proto, source, prop);
            }
        }
        else if (!hasOwn(proto, prop)) {
            setProp(proto, source, prop);
        }
    }
    return proto;
}
/**
 * Merges properties and methods across the prototype chain.
 */
function mergeHierarchy(ctor, mixin, mergeSuper = false) {
    mergeIfNotExists(ctor.prototype, mixin.prototype, mergeSuper);
    const _super = Object.getPrototypeOf(mixin);
    // Every user defined class or functions that can be instantiated have their
    // own names, if no name appears, that means the function has traveled to 
    // the root of the hierarchical tree.
    if (_super.name) {
        mergeHierarchy(ctor, _super, true);
    }
}
/**
 * Sets property for prototype based on the given source and prop name properly.
 */
function setProp(proto, source, prop) {
    const desc = Object.getOwnPropertyDescriptor(source, prop);
    if (desc) {
        Object.defineProperty(proto, prop, desc);
    }
    else {
        proto[prop] = source[prop];
    }
}
function mixin(base, ...mixins) {
    const obj = { ctor: null };
    obj.ctor = class extends base {
    }; // make sure this class has no name
    for (const mixin of mixins) {
        if (typeof mixin == "function") {
            mergeHierarchy(obj.ctor, mixin);
        }
        else if (mixin && typeof mixin == "object") {
            mergeIfNotExists(obj.ctor.prototype, mixin);
        }
        else {
            throw new TypeError("mixin must be a constructor or an object");
        }
    }
    return obj.ctor;
}

export { isClass, isSubclassOf, mixin };
//# sourceMappingURL=class.js.map
