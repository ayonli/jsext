/**
 * Declares a class that combines all methods from the base classes.
 * @module
 */
/**
 * Merges properties and methods only if they're missing in the class.
 */
function mergeIfNotExists(proto, source, mergeSuper = false) {
    const props = Reflect.ownKeys(source);
    for (const prop of props) {
        if (prop === "constructor") {
            continue;
        }
        else if (mergeSuper) {
            // When merging properties from super classes, the properties in the
            // base class has the first priority and shall not be overwrite.
            if (!(prop in proto)) {
                setProp(proto, source, prop);
            }
        }
        else if (!Object.prototype.hasOwnProperty.call(proto, prop)) {
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
        if (typeof mixin === "function") {
            mergeHierarchy(obj.ctor, mixin);
        }
        else if (mixin && typeof mixin === "object") {
            mergeIfNotExists(obj.ctor.prototype, mixin);
        }
        else {
            throw new TypeError("Mixin must be a constructor or an object.");
        }
    }
    return obj.ctor;
}

export { mixin as default };
//# sourceMappingURL=mixin.js.map
