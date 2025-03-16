import { registerKnownError } from '../error.js';
import Exception from '../error/Exception.js';

/**
 * This error indicates that the operation is invalid, such as trying to copy a
 * directory without the `recursive` option.
 *
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
class InvalidOperationError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "InvalidOperationError", code: 400 });
    }
}
registerKnownError(InvalidOperationError);
/**
 * This error indicates that an operation cannot be performed because the target
 * path is a directory while a file is expected.
 *
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
class IsDirectoryError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "IsDirectoryError", code: 400 });
    }
}
registerKnownError(IsDirectoryError);
/**
 * This error indicates that an operation cannot be performed because the target
 * path is a file while a directory is expected.
 *
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
class NotDirectoryError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NotDirectoryError", code: 400 });
    }
}
registerKnownError(NotDirectoryError);
/**
 * This error indicates that the file is too large, or the file system doesn't
 * have enough space to store the new content.
 *
 * NOTE: This error has an HTTP-compatible code of `413`.
 */
class FileTooLargeError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FileTooLargeError", code: 413 });
    }
}
registerKnownError(FileTooLargeError);
/**
 * This error indicates that too many symbolic links were encountered when
 * resolving the filename.
 *
 * NOTE: This error has an HTTP-compatible code of `508`.
 */
class FilesystemLoopError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FilesystemLoopError", code: 508 });
    }
}
registerKnownError(FilesystemLoopError);
/**
 * This error indicates that the file is busy at the moment, such as being
 * locked by another program.
 *
 * NOTE: This error has an HTTP-compatible code of `423`.
 */
class BusyError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "BusyError", code: 423 });
    }
}
registerKnownError(BusyError);
/**
 * This error indicates that the operation is interrupted by the underlying file
 * system.
 *
 * NOTE: This error has an HTTP-compatible code of `500`.
 */
class InterruptedError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "InterruptedError", code: 500 });
    }
}
registerKnownError(InterruptedError);

export { BusyError, FileTooLargeError, FilesystemLoopError, InterruptedError, InvalidOperationError, IsDirectoryError, NotDirectoryError };
//# sourceMappingURL=errors.js.map
