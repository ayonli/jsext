/**
 * This module includes some common errors that can be used in the application.
 * @module
 */

import Exception from "./Exception.ts";

/**
 * This error indicates that the requested operation, such as modifying a file,
 * is not allowed by the current user.
 */
export class NotAllowedError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "NotAllowedError", code: 403 });
    }
}

/**
 * This error indicates that the requested resource, such as a file, is not
 * found.
 */
export class NotFoundError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "NotFoundError", code: 404 });
    }
}

/**
 * This error indicates that the target resource path, such as a file, already
 * exists.
 */
export class AlreadyExistsError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "AlreadyExistsError", code: 409 });
    }
}

/**
 * This error indicates that the requested function or feature is not supported
 * by the current environment.
 */
export class NotSupportedError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "NotSupportedError", code: 405 });
    }
}

/**
 * This error indicates that the requested operation, such as a function, is not
 * implemented.
 * 
 * NOTE: `NotImplementedError` should only be used for stubs or placeholders,
 * it should not be used to indicate the lack of support for a feature, in such
 * cases, use {@link NotSupportedError} instead.
 */
export class NotImplementedError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "NotImplementedError", code: 501 });
    }
}

/**
 * This error indicates that the requested operation, such as a network request,
 * is timed out.
 */
export class TimeoutError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "TimeoutError", code: 408 });
    }
}

/**
 * This error indicates that the connection between the client and the server
 * cannot be established.
 */
export class NetworkError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "NetworkError" });
    }
}
