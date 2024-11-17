import { orderBy, startsWith } from '../array.js';
import { omit } from '../object.js';
import Exception from '../error/Exception.js';
import '../external/event-target-polyfill/index.js';
import { getMIME } from '../filetype.js';
import { extname, basename } from '../path.js';
import { split } from '../path/util.js';

function getErrorName(err) {
    if (err.constructor === Error) {
        return err.constructor.name;
    }
    else {
        return err.name;
    }
}
/**
 * Wraps a raw file system error to a predefined error by this module.
 *
 * @param type Used for `FileSystemHandle` operations.
 */
function wrapFsError(err, type = undefined) {
    if (err instanceof Error && !(err instanceof Exception) && !(err instanceof TypeError)) {
        const errName = getErrorName(err);
        const errCode = err.code;
        if (errName === "NotFoundError"
            || errName === "NotFound"
            || errCode === "ENOENT"
            || errCode === "ENOTFOUND") {
            return new Exception(err.message, { name: "NotFoundError", code: 404, cause: err });
        }
        else if (errName === "NotAllowedError"
            || errName === "PermissionDenied"
            || errName === "InvalidStateError"
            || errName === "SecurityError"
            || errName === "EACCES"
            || errCode === "EPERM"
            || errCode === "ERR_ACCESS_DENIED") {
            return new Exception(err.message, { name: "NotAllowedError", code: 403, cause: err });
        }
        else if (errName === "AlreadyExists"
            || errCode === "EEXIST"
            || errCode === "ERR_FS_CP_EEXIST") {
            return new Exception(err.message, { name: "AlreadyExistsError", code: 409, cause: err });
        }
        else if ((errName === "TypeMismatchError" && type === "file")
            || errName === "IsADirectory"
            || errCode === "EISDIR"
            || errCode === "ERR_FS_EISDIR") {
            return new Exception(err.message, { name: "IsDirectoryError", code: 415, cause: err });
        }
        else if ((errName === "TypeMismatchError" && type === "directory")
            || errName === "NotADirectory"
            || errCode === "ENOTDIR") {
            return new Exception(err.message, { name: "NotDirectoryError", code: 415, cause: err });
        }
        else if (errName === "InvalidModificationError"
            || errName === "NotSupported"
            || errCode === "ENOTEMPTY"
            || errCode === "ERR_FS_CP_EINVAL"
            || errCode === "ERR_FS_CP_FIFO_PIPE"
            || errCode === "ERR_FS_CP_DIR_TO_NON_DIR"
            || errCode === "ERR_FS_CP_NON_DIR_TO_DIR"
            || errCode === "ERR_FS_CP_SOCKET"
            || errCode === "ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY"
            || errCode === "ERR_FS_CP_UNKNOWN"
            || errCode === "ERR_FS_INVALID_SYMLINK_TYPE") {
            return new Exception(err.message, { name: "InvalidOperationError", code: 405, cause: err });
        }
        else if (errName === "NoModificationAllowedError"
            || errName === "Busy"
            || errName === "TimedOut"
            || errCode === "ERR_DIR_CONCURRENT_OPERATION") {
            return new Exception(errName, { name: "BusyError", code: 409, cause: err });
        }
        else if (errName === "Interrupted" || errCode === "ERR_DIR_CLOSED") {
            return new Exception(err.message, { name: "InterruptedError", code: 409, cause: err });
        }
        else if (errName === "QuotaExceededError"
            || errCode === "ERR_FS_FILE_TOO_LARGE") {
            return new Exception(err.message, { name: "FileTooLargeError", code: 413, cause: err });
        }
        else if (errName === "FilesystemLoop") {
            return new Exception(err.message, { name: "FilesystemLoopError", code: 508, cause: err });
        }
        else {
            return err;
        }
    }
    else if (err instanceof Error) {
        return err;
    }
    else if (typeof err === "string") {
        return new Exception(err, { code: 500, cause: err });
    }
    else {
        return new Exception("Unknown error", { code: 500, cause: err });
    }
}
/**
 * Wraps a raw file system operation so that when any error occurs, the error is
 * wrapped to a predefined error by this module.
 *
 * @param type Only used for `FileSystemHandle` operations.
 */
function rawOp(op, type = undefined) {
    return op.catch((err) => {
        throw wrapFsError(err, type);
    });
}
function fixDirEntry(entry) {
    Object.defineProperty(entry, "path", {
        get() {
            return entry.relativePath;
        },
    });
    return entry;
}
function fixFileType(file) {
    var _a;
    if (!file.type) {
        const ext = extname(file.name);
        if (ext) {
            Object.defineProperty(file, "type", {
                value: (_a = getMIME(ext)) !== null && _a !== void 0 ? _a : "",
                writable: false,
                configurable: true,
            });
        }
    }
    return file;
}
/**
 * @param addPathProp `DirEntry.prop` is deprecated, this option is for backward
 * compatibility.
 */
function makeTree(dir, entries, addPathProp = false) {
    const list = entries.map(entry => ({
        ...entry,
        paths: split(entry.relativePath),
    }));
    const nodes = (function walk(list, store) {
        // Order the entries first by kind, then by names alphabetically.
        list = [
            ...orderBy(list.filter(e => e.kind === "directory"), e => e.name, "asc"),
            ...orderBy(list.filter(e => e.kind === "file"), e => e.name, "asc"),
        ];
        const nodes = [];
        for (const entry of list) {
            if (entry.kind === "directory") {
                const paths = entry.paths;
                const childEntries = store.filter(e => startsWith(e.paths, paths));
                const directChildren = childEntries
                    .filter(e => e.paths.length === paths.length + 1);
                if (directChildren.length) {
                    const indirectChildren = childEntries
                        .filter(e => !directChildren.includes(e));
                    const _entry = {
                        ...omit(entry, ["paths"]),
                        children: walk(directChildren, indirectChildren),
                    };
                    addPathProp && fixDirEntry(_entry);
                    nodes.push(_entry);
                }
                else {
                    let _entry = {
                        ...omit(entry, ["paths"]),
                        children: [],
                    };
                    addPathProp && fixDirEntry(_entry);
                    nodes.push(_entry);
                }
            }
            else {
                const _entry = {
                    ...omit(entry, ["paths"]),
                };
                addPathProp && fixDirEntry(_entry);
                nodes.push(_entry);
            }
        }
        return nodes;
    })(list.filter(entry => entry.paths.length === 1), list.filter(entry => entry.paths.length > 1));
    let rootName;
    if (typeof dir === "object") {
        rootName = dir.name || "(root)";
    }
    else if (dir) {
        rootName = basename(dir);
        if (!rootName || rootName === ".") {
            rootName = "(root)";
        }
    }
    else {
        rootName = "(root)";
    }
    const rooEntry = {
        name: rootName,
        kind: "directory",
        relativePath: "",
        children: nodes,
    };
    if (typeof dir === "object") {
        rooEntry.handle = dir;
    }
    addPathProp && fixDirEntry(rooEntry);
    return rooEntry;
}

export { fixDirEntry, fixFileType, makeTree, rawOp, wrapFsError };
//# sourceMappingURL=util.js.map
