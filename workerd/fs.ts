import type { FileSystemOptions, FileInfo, DirEntry, DirTree } from "../fs/types";

export type { FileSystemOptions, FileInfo, DirEntry, DirTree };

export const EOL: "\n" | "\r\n" = "\n";

export async function getDirHandle(path: string, options: FileSystemOptions & {
    create?: boolean;
    recursive?: boolean;
} = {}): Promise<FileSystemDirectoryHandle> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function getFileHandle(path: string, options: FileSystemOptions & {
    create?: boolean;
} = {}): Promise<FileSystemFileHandle> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function exists(path: string, options: FileSystemOptions = {}): Promise<boolean> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function stat(
    target: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: FileSystemOptions = {}
): Promise<FileInfo> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function mkdir(path: string, options: FileSystemOptions & {
    recursive?: boolean;
    mode?: number;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function ensureDir(path: string, options: FileSystemOptions & {
    mode?: number;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function* readDir(target: string | FileSystemDirectoryHandle, options: FileSystemOptions & {
    recursive?: boolean;
} = {}): AsyncIterable<DirEntry> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readTree(
    target: string | FileSystemDirectoryHandle,
    options: FileSystemOptions = {}
): Promise<DirTree> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readFile(target: string | FileSystemFileHandle, options: FileSystemOptions & {
    signal?: AbortSignal;
} = {}): Promise<Uint8Array> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readFileAsText(target: string | FileSystemFileHandle, options: FileSystemOptions & {
    signal?: AbortSignal;
} = {}): Promise<string> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function writeFile(target: string | FileSystemFileHandle,
    data: Uint8Array | string,
    options: FileSystemOptions & {
        append?: boolean;
        mode?: number;
        signal?: AbortSignal;
    } = {}
): Promise<void> {
    void target, data, options;
    throw new Error("Unsupported runtime");
}

export async function writeLines(
    target: string | FileSystemFileHandle,
    lines: string[],
    options: FileSystemOptions & {
        append?: boolean;
        mode?: number;
        signal?: AbortSignal;
    } = {}
): Promise<void> {
    void target, lines, options;
    throw new Error("Unsupported runtime");
}

export async function truncate(
    target: string | FileSystemFileHandle,
    size = 0,
    options: FileSystemOptions = {}
): Promise<void> {
    void target, size, options;
    throw new Error("Unsupported runtime");
}

export async function remove(path: string, options: FileSystemOptions & {
    recursive?: boolean;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function rename(
    oldPath: string,
    newPath: string,
    options: FileSystemOptions = {}
): Promise<void> {
    void oldPath, newPath, options;
    throw new Error("Unsupported runtime");
}

export async function copy(
    src: string,
    dest: string,
    options?: FileSystemOptions & { recursive?: boolean; }
): Promise<void>;
export async function copy(
    src: FileSystemFileHandle,
    dest: FileSystemFileHandle | FileSystemDirectoryHandle
): Promise<void>;
export async function copy(
    src: FileSystemDirectoryHandle,
    dest: FileSystemDirectoryHandle,
    options?: { recursive?: boolean; }
): Promise<void>;
export async function copy(
    src: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: FileSystemOptions & {
        recursive?: boolean;
    } = {}
): Promise<void> {
    void src, dest, options;
    throw new Error("Unsupported runtime");
}

export async function link(src: string, dest: string, options: {
    symbolic?: boolean;
} = {}): Promise<void> {
    void src, dest, options;
    throw new Error("Unsupported runtime");
}

export async function readLink(path: string): Promise<string> {
    void path;
    throw new Error("Unsupported runtime");
}

export async function chmod(path: string, mode: number): Promise<void> {
    void path, mode;
    throw new Error("Unsupported runtime");
}

export async function chown(path: string, uid: number, gid: number): Promise<void> {
    void path, uid, gid;
    throw new Error("Unsupported runtime");
}

export async function utimes(
    path: string,
    atime: number | Date,
    mtime: number | Date
): Promise<void> {
    void path, atime, mtime;
    throw new Error("Unsupported runtime");
}
