/**
 * Checks if a class is a subclass of another class.
 *
 * @example
 * ```ts
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

export { isSubclassOf as default };
//# sourceMappingURL=isSubclassOf.js.map
