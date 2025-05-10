import {
    Exception,
    NotAllowedError,
    NotFoundError,
    AlreadyExistsError,
    NotSupportedError,
    NotImplementedError,
    TimeoutError,
    NetworkError,
    toErrorEvent,
    fromObject,
    toObject,
    fromErrorEvent,
    isCausedBy as _isCausedBy,
} from "@jsext/error";
import { Constructor } from "@jsext/types";

declare global {
    interface Error {
        toJSON(): { [x: string]: any; };
        isCausedBy(cause: unknown): boolean;
    }

    interface ErrorConstructor {
        /** Transforms the error to a plain object. */
        toObject<T extends Error>(err: T): { [x: string | symbol]: any; };
        /** Reverses a plain object to a specific error type. */
        fromObject<T extends { name: "Error"; }>(obj: T): Error;
        fromObject<T extends { name: "EvalError"; }>(obj: T): EvalError;
        fromObject<T extends { name: "RangeError"; }>(obj: T): RangeError;
        fromObject<T extends { name: "ReferenceError"; }>(obj: T): ReferenceError;
        fromObject<T extends { name: "SyntaxError"; }>(obj: T): SyntaxError;
        fromObject<T extends { name: "TypeError"; }>(obj: T): TypeError;
        fromObject<T extends { name: "URIError"; }>(obj: T): URIError;
        fromObject<T extends { name: "Exception"; }>(obj: T): Exception;
        fromObject<T extends Error>(obj: { [x: string | symbol]: any; }, ctor?: Constructor<Error>): T | null;

        /** Creates an `ErrorEvent` instance based on the given error. */
        toErrorEvent(err: Error, type?: string): ErrorEvent;
        /** Creates an error instance based on the given `ErrorEvent` instance. */
        fromErrorEvent<T extends Error>(event: ErrorEvent): T | null;
    }

    class Exception extends Error {
        readonly cause?: unknown;
        readonly code: number;
        constructor(message: string, name?: string);
        constructor(message: string, code?: number);
        constructor(message: string, options: { name?: string; cause?: unknown; code?: number; });
    }

    class NotAllowedError extends Exception {
        constructor(message: string, options?: ErrorOptions);
    }

    class NotFoundError extends Exception {
        constructor(message: string, options?: ErrorOptions);
    }

    class AlreadyExistsError extends Exception {
        constructor(message: string, options?: ErrorOptions);
    }

    class NotSupportedError extends Exception {
        constructor(message: string, options?: ErrorOptions);
    }

    class NotImplementedError extends Exception {
        constructor(message: string, options?: ErrorOptions);
    }

    class TimeoutError extends Exception {
        constructor(message: string, options?: ErrorOptions);
    }

    class NetworkError extends Exception {
        constructor(message: string, options?: ErrorOptions);
    }
}

//@ts-ignore
globalThis["Exception"] = Exception;
//@ts-ignore
globalThis["NotAllowedError"] = NotAllowedError;
//@ts-ignore
globalThis["NotFoundError"] = NotFoundError;
//@ts-ignore
globalThis["AlreadyExistsError"] = AlreadyExistsError;
//@ts-ignore
globalThis["NotSupportedError"] = NotSupportedError;
//@ts-ignore
globalThis["NotImplementedError"] = NotImplementedError;
//@ts-ignore
globalThis["TimeoutError"] = TimeoutError;
//@ts-ignore
globalThis["NetworkError"] = NetworkError;

Error.toObject = toObject;
Error.fromObject = fromObject;
Error.toErrorEvent = toErrorEvent;
Error.fromErrorEvent = fromErrorEvent;

Error.prototype.toJSON = function toJSON() {
    return toObject(this);
};

Error.prototype.isCausedBy = function isCausedBy(cause: unknown) {
    return _isCausedBy(this, cause);
};
