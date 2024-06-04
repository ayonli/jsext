import { omit, isPlainObject } from './object.js';
import Exception from './error/Exception.js';

/**
 * Functions for converting errors to/from other types of objects.
 * @module
 */
/**
 * Transforms the error to a plain object.
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
    var _a, _b;
    // @ts-ignore
    if (!(obj === null || obj === void 0 ? void 0 : obj.name)) {
        return null;
    }
    // @ts-ignore
    ctor || (ctor = (globalThis[obj["@@type"] || obj.name] || globalThis[obj.name]));
    if (!ctor) {
        if (obj["@@type"] === "Exception") {
            ctor = Exception;
        }
        else {
            ctor = Error;
        }
    }
    let err;
    if (ctor.name === "DOMException" && typeof DOMException === "function") {
        err = new ctor((_a = obj["message"]) !== null && _a !== void 0 ? _a : "", obj["name"]);
    }
    else {
        err = Object.create(ctor.prototype, {
            message: {
                configurable: true,
                enumerable: false,
                writable: true,
                value: (_b = obj["message"]) !== null && _b !== void 0 ? _b : "",
            },
        });
    }
    if (err.name !== obj["name"]) {
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
        err = fromObject(event.error, Error);
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
function createErrorEvent(type, options = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (typeof ErrorEvent === "function") {
        return new ErrorEvent(type, options);
    }
    else {
        const event = new Event(type, {
            bubbles: (_a = options === null || options === void 0 ? void 0 : options.bubbles) !== null && _a !== void 0 ? _a : false,
            cancelable: (_b = options === null || options === void 0 ? void 0 : options.cancelable) !== null && _b !== void 0 ? _b : false,
            composed: (_c = options === null || options === void 0 ? void 0 : options.composed) !== null && _c !== void 0 ? _c : false,
        });
        Object.defineProperties(event, {
            message: { value: (_d = options === null || options === void 0 ? void 0 : options.message) !== null && _d !== void 0 ? _d : "" },
            filename: { value: (_e = options === null || options === void 0 ? void 0 : options.filename) !== null && _e !== void 0 ? _e : "" },
            lineno: { value: (_f = options === null || options === void 0 ? void 0 : options.lineno) !== null && _f !== void 0 ? _f : 0 },
            colno: { value: (_g = options === null || options === void 0 ? void 0 : options.colno) !== null && _g !== void 0 ? _g : 0 },
            error: { value: (_h = options === null || options === void 0 ? void 0 : options.error) !== null && _h !== void 0 ? _h : undefined },
        });
        return event;
    }
}
function createCloseEvent(type, options = {}) {
    var _a, _b, _c, _d, _e, _f;
    if (typeof CloseEvent === "function") {
        return new CloseEvent(type, options);
    }
    else {
        const event = new Event(type, {
            bubbles: (_a = options === null || options === void 0 ? void 0 : options.bubbles) !== null && _a !== void 0 ? _a : false,
            cancelable: (_b = options === null || options === void 0 ? void 0 : options.cancelable) !== null && _b !== void 0 ? _b : false,
            composed: (_c = options === null || options === void 0 ? void 0 : options.composed) !== null && _c !== void 0 ? _c : false,
        });
        Object.defineProperties(event, {
            code: { value: (_d = options.code) !== null && _d !== void 0 ? _d : 0 },
            reason: { value: (_e = options.reason) !== null && _e !== void 0 ? _e : "" },
            wasClean: { value: (_f = options.wasClean) !== null && _f !== void 0 ? _f : false },
        });
        return event;
    }
}
function createProgressEvent(type, options = {}) {
    var _a, _b, _c, _d, _e, _f;
    if (typeof ProgressEvent === "function") {
        return new ProgressEvent(type, options);
    }
    else {
        const event = new Event(type, {
            bubbles: (_a = options === null || options === void 0 ? void 0 : options.bubbles) !== null && _a !== void 0 ? _a : false,
            cancelable: (_b = options === null || options === void 0 ? void 0 : options.cancelable) !== null && _b !== void 0 ? _b : false,
            composed: (_c = options === null || options === void 0 ? void 0 : options.composed) !== null && _c !== void 0 ? _c : false,
        });
        Object.defineProperties(event, {
            lengthComputable: { value: (_d = options === null || options === void 0 ? void 0 : options.lengthComputable) !== null && _d !== void 0 ? _d : false },
            loaded: { value: (_e = options === null || options === void 0 ? void 0 : options.loaded) !== null && _e !== void 0 ? _e : 0 },
            total: { value: (_f = options === null || options === void 0 ? void 0 : options.total) !== null && _f !== void 0 ? _f : 0 },
        });
        return event;
    }
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

export { Exception, createCloseEvent, createErrorEvent, createProgressEvent, fromErrorEvent, fromObject, isAggregateError, isDOMException, toErrorEvent, toObject };
//# sourceMappingURL=error.js.map
