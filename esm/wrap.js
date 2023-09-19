/**
 * Wraps a function inside another function and returns a new function that copies the original
 * function's name and other properties.
 */
function wrap(fn, wrapper) {
    const wrapped = function (...args) {
        return wrapper.call(this, fn, ...args);
    };
    Object.defineProperty(wrapped, "name", Object.getOwnPropertyDescriptor(fn, "name"));
    Object.defineProperty(wrapped, "length", Object.getOwnPropertyDescriptor(fn, "length"));
    Object.defineProperty(wrapped, "toString", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: fn.toString.bind(fn),
    });
    return wrapped;
}

export { wrap as default };
//# sourceMappingURL=wrap.js.map
