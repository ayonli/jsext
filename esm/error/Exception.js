/**
 * A generic exception class, which can be used to represent any kind of error.
 * It's similar to the `DOMException`, but for any JavaScript environment.
 *
 * @example
 * ```ts
 * // throw an exception with a name
 * import { Exception } from "@ayonli/jsext/error";
 *
 * throw new Exception("Operation timeout after 5 seconds", "TimeoutError");
 * ```
 *
 * @example
 * ```ts
 * // throw an exception with a code (not recommended, always use a name or both)
 * import { Exception } from "@ayonli/jsext/error";
 *
 * throw new Exception("Operation timeout after 5 seconds", 408);
 * ```
 *
 * @example
 * ```ts
 * // throw an exception with a cause
 * import { Exception } from "@ayonli/jsext/error";
 *
 * try {
 *     throw new Error("Something went wrong");
 * } catch (error) {
 *     throw new Exception("An error occurred", { cause: error });
 * }
 * ```
 */
class Exception extends Error {
    constructor(message, options = 0) {
        super(message);
        this.code = 0;
        if (typeof options === "number") {
            this.code = options;
        }
        else if (typeof options === "string") {
            Object.defineProperty(this, "name", {
                configurable: true,
                enumerable: false,
                writable: true,
                value: options,
            });
        }
        else {
            if (options.name) {
                Object.defineProperty(this, "name", {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: options.name,
                });
            }
            if (options.cause) {
                Object.defineProperty(this, "cause", {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: options.cause,
                });
            }
            if (options.code) {
                this.code = options.code;
            }
        }
    }
}
Object.defineProperty(Exception.prototype, "name", {
    configurable: true,
    enumerable: false,
    get() {
        return this.constructor.name;
    },
});

export { Exception as default };
//# sourceMappingURL=Exception.js.map
