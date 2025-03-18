import { omit, isPlainObject } from './object.js';
import Exception from './error/Exception.js';
import * as error_common from './error/common.js';
export { AlreadyExistsError, NetworkError, NotAllowedError, NotFoundError, NotImplementedError, NotSupportedError, TimeoutError } from './error/common.js';
import { createErrorEvent } from './event.js';
import { isSubclassOf } from './class.js';

/**
 * Functions for converting errors to/from other types of objects.
 * @module
 */
const { NotSupportedError } = error_common;
const errorTypeRegistry = new Map([
    ["Exception", Exception]
]);
/**
 * Registers an error constructor that can be used by {@link fromObject} to
 * reverse a plain object which is previously transformed by {@link toObject}
 * back to an error instance.
 * */
function registerErrorType(ctor) {
    errorTypeRegistry.set(ctor.name, ctor);
}
/**
 * Returns the error constructor by the `name`.
 * @inner
 */
function getErrorType(name) {
    let type = errorTypeRegistry.get(name);
    if (!type && name in globalThis) {
        const value = globalThis[name];
        if (value === Error || isSubclassOf(value, Error) ||
            (typeof DOMException === "function" && value === DOMException)) {
            type = value;
        }
    }
    return type ? type : null;
}
const commonErrors = Object.values(error_common)
    .filter(value => isSubclassOf(value, Error));
commonErrors.forEach(ctor => registerErrorType(ctor));
/**
 * Transforms the error to a plain object so that it can be serialized to JSON
 * and later reversed back to an error instance using {@link fromObject}.
 *
 * @example
 * ```ts
 * import { toObject } from "@ayonli/jsext/error";
 *
 * const err = new Error("Something went wrong.");
 *
 * const obj = toObject(err);
 * console.log(obj);
 * // {
 * //     "@@type": "Error",
 * //     name: "Error",
 * //     message: "Something went wrong.",
 * //     stack: "Error: Something went wrong.\n    at <anonymous>:1:13"
 * // }
 * ```
 */
function toObject(err) {
    if (!(err instanceof Error) && err["name"] && err["message"]) { // Error-like
        err = fromObject(err, Error);
    }
    const obj = {
        "@@type": err.constructor.name,
        ...omit(err, ["toString", "toJSON", "__callSiteEvals"]),
    };
    if (obj["@@type"] === "AggregateError" && Array.isArray(obj["errors"])) {
        obj["errors"] = obj["errors"].map(item => {
            return item instanceof Error ? toObject(item) : item;
        });
    }
    return obj;
}
function fromObject(obj, ctor = undefined) {
    var _a, _b, _c;
    // @ts-ignore
    if (!(obj === null || obj === void 0 ? void 0 : obj.name)) {
        return null;
    }
    // @ts-ignore
    const typeName = obj["@@type"] || obj.name;
    // @ts-ignore
    ctor !== null && ctor !== void 0 ? ctor : (ctor = ((_a = getErrorType(typeName)) !== null && _a !== void 0 ? _a : Error));
    let err;
    if (ctor.name === "DOMException" && typeof DOMException === "function") {
        err = new ctor((_b = obj["message"]) !== null && _b !== void 0 ? _b : "", obj["name"]);
    }
    else {
        err = Object.create(ctor.prototype, {
            message: {
                configurable: true,
                enumerable: false,
                writable: true,
                value: (_c = obj["message"]) !== null && _c !== void 0 ? _c : "",
            },
        });
        Object.defineProperty(err, "name", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["name"],
        });
    }
    if (obj["stack"] !== undefined) {
        Object.defineProperty(err, "stack", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["stack"],
        });
    }
    if (obj["cause"] != undefined) {
        Object.defineProperty(err, "cause", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["cause"],
        });
    }
    const otherKeys = Reflect.ownKeys(obj).filter(key => ![
        "@@type",
        "name",
        "message",
        "stack",
        "cause"
    ].includes(key));
    otherKeys.forEach(key => {
        var _a;
        // @ts-ignore
        (_a = err[key]) !== null && _a !== void 0 ? _a : (err[key] = obj[key]);
    });
    // @ts-ignore
    if (isAggregateError(err) && Array.isArray(err["errors"])) {
        err["errors"] = err["errors"].map(item => {
            return isPlainObject(item) ? fromObject(item) : item;
        });
    }
    return err;
}
/**
 * Creates an `ErrorEvent` instance based on the given error.
 *
 * @example
 * ```ts
 * import { toErrorEvent } from "@ayonli/jsext/error";
 *
 * const err = new Error("Something went wrong.");
 *
 * const event = toErrorEvent(err);
 * console.log(event);
 * // ErrorEvent {
 * //     error: Error: Something went wrong.
 * //         at <anonymous>:1:13,
 * //     message: "Something went wrong.",
 * //     filename: "",
 * //     lineno: 1,
 * //     colno: 13
 * // }
 * ```
 */
function toErrorEvent(err, type = "error") {
    let filename = "";
    let lineno = 0;
    let colno = 0;
    if (err.stack) {
        const lines = err.stack.split("\n").map(line => line.trim());
        let callSite = lines.find(line => line.startsWith("at "));
        if (callSite) {
            callSite = callSite.slice(3);
        }
        else if (callSite = lines.find(line => line.includes("@") && line.length > 1)) {
            callSite = callSite.slice(callSite.indexOf("@") + 1);
        }
        if (callSite) {
            let start = callSite.lastIndexOf("(");
            let end = 0;
            if (start !== -1) {
                start += 1;
                end = callSite.indexOf(")", start);
                callSite = callSite.slice(start, end);
            }
            const matches = callSite.match(/:(\d+):(\d+)$/);
            if (matches) {
                filename = callSite.slice(0, matches.index);
                lineno = parseInt(matches[1]);
                colno = parseInt(matches[2]);
            }
        }
    }
    return createErrorEvent(type, {
        error: err,
        message: err.message,
        filename,
        lineno,
        colno,
    });
}
/**
 * Creates an error instance based on the given `ErrorEvent` instance.
 *
 * @example
 * ```ts
 * import { fromErrorEvent } from "@ayonli/jsext/error";
 *
 * const event = new ErrorEvent("error", {
 *     message: "Something went wrong.",
 *     filename: "",
 *     lineno: 1,
 *     colno: 13,
 * });
 *
 * const err = fromErrorEvent(event);
 * console.log(err);
 * // Error: Something went wrong.
 * //     at <anonymous>:1:13
 * ```
 */
function fromErrorEvent(event) {
    if (event.error instanceof Error) {
        return event.error;
    }
    let err;
    let shouldPatchStack = false;
    if (event.error
        && typeof event.error === "object"
        && event.error["name"]
        && event.error["message"]) { // Error-like
        err = fromObject(event.error);
        shouldPatchStack = !err.stack;
    }
    else if (event.message) {
        err = new Error(event.message);
        shouldPatchStack = true;
    }
    else {
        return null;
    }
    if (shouldPatchStack) {
        let stack = "";
        if (typeof navigator === "object" && navigator.userAgent.includes("Firefox")) {
            if (event.filename) {
                stack = "@" + event.filename;
            }
            else {
                stack = "@debugger eval code";
            }
        }
        else if (typeof navigator === "object"
            && navigator.userAgent.includes("Safari")
            && !navigator.userAgent.includes("Chrome") // Chrome likes to pretend it's Safari
        ) {
            if (event.filename) {
                stack = "@" + event.filename;
            }
            else {
                stack = "global code@";
            }
        }
        else {
            stack = `${err.name}: ${event.message}\n    at ${event.filename || "<anonymous>"}`;
        }
        if (event.lineno && stack !== "global code@") {
            stack += ":" + event.lineno;
        }
        if (event.colno && stack !== "global code@") {
            stack += ":" + event.colno;
        }
        Object.defineProperty(err, "stack", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: stack,
        });
    }
    return err;
}
/** @inner */
function isDOMException(value) {
    return ((typeof DOMException === "function") && (value instanceof DOMException))
        || (value instanceof Error && value.constructor.name === "DOMException"); // Node.js v16-
}
/** @inner */
function isAggregateError(value) {
    // @ts-ignore
    return (typeof AggregateError === "function" && value instanceof AggregateError)
        || (value instanceof Error && value.constructor.name === "AggregateError");
}
/** @inner */
function throwUnsupportedRuntimeError() {
    throw new NotSupportedError("Unsupported runtime");
}
/**
 * Checks if the error is caused by the given `cause`. This function traverses
 * the cause chain until it reaches the end.
 *
 * The given `cause` can be a value or an error constructor. If it's a value,
 * the error and the cause will be compared using `===`. If it's an error
 * constructor, the error and the cause will be compared using `instanceof`.
 *
 * @example
 * ```ts
 * import { isCausedBy } from "@ayonli/jsext/error";
 *
 * const err1 = "The first error";
 * const err2 = new Error("The second error", { cause: err1 });
 *
 * class ThirdError extends Error {}
 * const err3 = new ThirdError("The third error", { cause: err2 });
 *
 * const err4 = new Error("The fourth error", { cause: err3 });
 *
 * console.log(isCausedBy(err4, ThirdError)); // true
 * console.log(isCausedBy(err4, err2)); // true
 * console.log(isCausedBy(err4, err1)); // true
 * ```
 */
function isCausedBy(error, cause) {
    while (true) {
        if (error.cause === cause ||
            Object.is(error.cause, cause) ||
            (typeof cause === "function" && error.cause instanceof cause)) {
            return true;
        }
        else if (error.cause instanceof Error) {
            error = error.cause;
        }
        else {
            break;
        }
    }
    return false;
}

export { Exception, fromErrorEvent, fromObject, getErrorType, isAggregateError, isCausedBy, isDOMException, registerErrorType, throwUnsupportedRuntimeError, toErrorEvent, toObject };
//# sourceMappingURL=error.js.map
