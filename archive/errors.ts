import { Exception, registerKnownError } from "../error.ts";

/**
 * This error indicates that the filename is too long to be resolved by the file
 * system.
 * 
 * NOTE: This error has an HTTP-compatible code of `414`.
 */
export class FilenameTooLongError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "FilenameTooLongError", code: 414 });
    }
}
registerKnownError(FilenameTooLongError);

/**
 * This error indicates that the archive is corrupted or invalid.
 * 
 * NOTE: This error has an HTTP-compatible code of `400`.
 */
export class CorruptedArchiveError extends Exception {
    constructor(message: string, options: ErrorOptions = {}) {
        super(message, { ...options, name: "ArchiveCorruptedError", code: 400 });
    }
}
registerKnownError(CorruptedArchiveError);
