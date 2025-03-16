import '../bytes.js';
import Exception from '../error/Exception.js';
import '../external/event-target-polyfill/index.js';

/**
 * This error indicates that the filename is too long to be resolved by the file
 * system.
 *
 * NOTE: This error has an HTTP-compatible code of `414`.
 */
class FilenameTooLongError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "FilenameTooLongError", code: 414 });
    }
}
/**
 * This error indicates that the archive is corrupted or invalid.
 *
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
class CorruptedArchiveError extends Exception {
    constructor(message, options = {}) {
        super(message, { ...options, name: "ArchiveCorruptedError", code: 400 });
    }
}

export { CorruptedArchiveError, FilenameTooLongError };
//# sourceMappingURL=errors.js.map
