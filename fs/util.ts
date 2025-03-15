import { orderBy, startsWith } from "../array.ts";
import {
    AlreadyExistsError,
    Exception,
    NotAllowedError,
    NotFoundError,
} from "../error.ts";
import {
    BusyError,
    FileTooLargeError,
    FilesystemLoopError,
    InterruptedError,
    InvalidOperationError,
    IsDirectoryError,
    NotDirectoryError,
} from "./errors.ts";
import { getMIME } from "../filetype.ts";
import { omit } from "../object.ts";
import { basename, extname, isFileUrl, split, toFsPath } from "../path.ts";
import type { DirEntry } from "./types.ts";

export function ensureFsTarget<T extends string | URL | FileSystemFileHandle | FileSystemDirectoryHandle>(
    path: T
): string | Exclude<T, URL> {
    if (path instanceof URL) {
        if (path.protocol !== "file:") {
            throw new TypeError("Only file URLs are supported");
        } else {
            return toFsPath(path.href) as Exclude<T, URL>;
        }
    } else if (typeof path === "string" && isFileUrl(path)) {
        return toFsPath(path) as Exclude<T, URL>;
    } else {
        return path as Exclude<T, URL>;
    }
}

function getErrorName(err: Error): string {
    if (err.constructor === Error) {
        return err.constructor.name;
    } else {
        return err.name;
    }
}

/**
 * Wraps a raw file system error to a predefined error by this module.
 * 
 * @param type Used for `FileSystemHandle` operations.
 */
export function wrapFsError(
    err: unknown,
    type: "file" | "directory" | undefined = undefined
): Exception | Error {
    if (err instanceof Error && !(err instanceof Exception) && !(err instanceof TypeError)) {
        const errName = getErrorName(err);
        const errCode = (err as NodeJS.ErrnoException).code;

        if (errName === "NotFoundError"
            || errName === "NotFound"
            || errCode === "ENOENT"
            || errCode === "ENOTFOUND"
        ) {
            return new NotFoundError(err.message, { cause: err });
        } else if (errName === "NotAllowedError"
            || errName === "PermissionDenied"
            || errName === "InvalidStateError"
            || errName === "SecurityError"
            || errName === "EACCES"
            || errCode === "EPERM"
            || errCode === "ERR_ACCESS_DENIED"
        ) {
            return new NotAllowedError(err.message, { cause: err });
        } else if (errName === "AlreadyExists"
            || errCode === "EEXIST"
            || errCode === "ERR_FS_CP_EEXIST"
        ) {
            return new AlreadyExistsError(err.message, { cause: err });
        } else if ((errName === "TypeMismatchError" && type === "file")
            || errName === "IsADirectory"
            || errCode === "EISDIR"
            || errCode === "ERR_FS_EISDIR"
        ) {
            return new IsDirectoryError(err.message, { cause: err });
        } else if ((errName === "TypeMismatchError" && type === "directory")
            || errName === "NotADirectory"
            || errCode === "ENOTDIR"
        ) {
            return new NotDirectoryError(err.message, { cause: err });
        } else if (errName === "InvalidModificationError"
            || errName === "NotSupported"
            || errCode === "ENOTEMPTY"
            || errCode === "ERR_FS_CP_EINVAL"
            || errCode === "ERR_FS_CP_FIFO_PIPE"
            || errCode === "ERR_FS_CP_DIR_TO_NON_DIR"
            || errCode === "ERR_FS_CP_NON_DIR_TO_DIR"
            || errCode === "ERR_FS_CP_SOCKET"
            || errCode === "ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY"
            || errCode === "ERR_FS_CP_UNKNOWN"
            || errCode === "ERR_FS_INVALID_SYMLINK_TYPE"
        ) {
            return new InvalidOperationError(err.message, { cause: err });
        } else if (errName === "NoModificationAllowedError"
            || errName === "Busy"
            || errName === "TimedOut"
            || errCode === "ERR_DIR_CONCURRENT_OPERATION"
        ) {
            return new BusyError(errName, { cause: err });
        } else if (errName === "Interrupted" || errCode === "ERR_DIR_CLOSED") {
            return new InterruptedError(err.message, { cause: err });
        } else if (errName === "QuotaExceededError"
            || errCode === "ERR_FS_FILE_TOO_LARGE"
        ) {
            return new FileTooLargeError(err.message, { cause: err });
        } else if (errName === "FilesystemLoop") {
            return new FilesystemLoopError(err.message, { cause: err });
        } else {
            return err;
        }
    } else if (err instanceof Error) {
        return err;
    } else if (typeof err === "string") {
        return new Exception(err, { code: 500, cause: err });
    } else {
        return new Exception("Unknown error", { code: 500, cause: err });
    }
}

/**
 * Wraps a raw file system operation so that when any error occurs, the error is
 * wrapped to a predefined error by this module.
 * 
 * @param type Only used for `FileSystemHandle` operations.
 */
export function rawOp<T>(op: Promise<T>, type: "file" | "directory" | undefined = undefined): Promise<T> {
    return op.catch((err) => {
        throw wrapFsError(err, type);
    });
}

export function fixDirEntry<T extends DirEntry>(entry: T): T {
    // for backward compatibility
    Object.defineProperty(entry, "path", {
        get() {
            return entry.relativePath;
        },
    });

    return entry;
}


export function fixFileType(file: File): File {
    if (!file.type) {
        const ext = extname(file.name);

        if (ext) {
            Object.defineProperty(file, "type", {
                value: getMIME(ext) ?? "",
                writable: false,
                configurable: true,
            });
        }
    }

    return file;
}

type CompatDirEntry = Omit<DirEntry, "kind"> & {
    kind: string;
};

type CompatDirTree = Omit<DirEntry, "kind"> & {
    kind: string;
    children?: CompatDirTree[];
};

/**
 * @param addPathProp `DirEntry.prop` is deprecated, this option is for backward
 * compatibility.
 */
export function makeTree<I extends CompatDirEntry, R extends CompatDirTree>(
    dir: string | FileSystemDirectoryHandle,
    entries: I[],
    addPathProp = false
): R {
    type CustomDirEntry = I & { paths: string[]; };
    const list: CustomDirEntry[] = entries.map(entry => ({
        ...entry,
        paths: split(entry.relativePath),
    }));

    const nodes = (function walk(list: CustomDirEntry[], store: CustomDirEntry[]): R[] {
        // Order the entries first by kind, then by names alphabetically.
        list = [
            ...orderBy(list.filter(e => e.kind === "directory"), e => e.name, "asc"),
            ...orderBy(list.filter(e => e.kind === "file"), e => e.name, "asc"),
        ];

        const nodes: R[] = [];

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
                    } as unknown as R;

                    addPathProp && fixDirEntry(_entry as DirEntry);
                    nodes.push(_entry);
                } else {
                    let _entry = {
                        ...omit(entry, ["paths"]),
                        children: [],
                    } as unknown as R;

                    addPathProp && fixDirEntry(_entry as DirEntry);
                    nodes.push(_entry);
                }
            } else {
                const _entry = {
                    ...omit(entry, ["paths"]),
                } as unknown as R;

                addPathProp && fixDirEntry(_entry as DirEntry);
                nodes.push(_entry);
            }
        }

        return nodes;
    })(list.filter(entry => entry.paths.length === 1),
        list.filter(entry => entry.paths.length > 1));

    let rootName: string;

    if (typeof dir === "object") {
        rootName = dir.name || "(root)";
    } else if (dir) {
        rootName = basename(dir);

        if (!rootName || rootName === ".") {
            rootName = "(root)";
        }
    } else {
        rootName = "(root)";
    }

    const rooEntry = {
        name: rootName,
        kind: "directory",
        relativePath: "",
        children: nodes,
    } as unknown as R;

    if (typeof dir === "object") {
        rooEntry.handle = dir;
    }

    addPathProp && fixDirEntry(rooEntry as DirEntry);
    return rooEntry;
}
