import '../bytes.js';
import Exception from '../error/Exception.js';
import '../external/event-target-polyfill/index.js';

/**
 * This error indicates that the operation is invalid, such as trying to copy a
 * directory without the `recursive` option.
 */
class InvalidOperationError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "InvalidOperationError", code: 405 });
    }
}
/**
 * This error indicates that an operation cannot be performed because the target
 * path is a directory while a file is expected.
 */
class IsDirectoryError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "IsDirectoryError", code: 405 });
    }
}
/**
 * This error indicates that an operation cannot be performed because the target
 * path is a file while a directory is expected.
 */
class NotDirectoryError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "NotDirectoryError", code: 405 });
    }
}
/**
 * This error indicates that the file is too large, or the file system doesn't
 * have enough space to store the new content.
 */
class FileTooLargeError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FileTooLargeError", code: 413 });
    }
}
/**
 * This error indicates that the filename is too long to be resolved by the file
 * system.
 */
class FilenameTooLongError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FilenameTooLongError", code: 414 });
    }
}
/**
 * This error indicates that too many symbolic links were encountered when
 * resolving the filename.
 */
class FilesystemLoopError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FilesystemLoopError", code: 508 });
    }
}
/**
 * This error indicates that the file is busy at the moment, such as being
 * locked by another program.
 */
class BusyError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "BusyError", code: 423 });
    }
}
/**
 * This error indicates that the operation is interrupted by the underlying file
 * system.
 */
class InterruptedError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "InterruptedError", code: 500 });
    }
}

export { BusyError, FileTooLargeError, FilenameTooLongError, FilesystemLoopError, InterruptedError, InvalidOperationError, IsDirectoryError, NotDirectoryError };
//# sourceMappingURL=errors.js.map
