import type { CommonOptions, FileInfo, DirEntry, DirTree } from "../fs/types";

export type { CommonOptions, FileInfo, DirEntry, DirTree };

export const EOL: "\n" | "\r\n" = "\n";

export async function exists(path: string, options: CommonOptions = {}): Promise<boolean> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function stat(
    target: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: CommonOptions = {}
): Promise<FileInfo> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function mkdir(path: string, options: CommonOptions & {
    recursive?: boolean;
    mode?: number;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function ensureDir(path: string, options: CommonOptions & {
    mode?: number;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function* readDir(target: string | FileSystemDirectoryHandle, options: CommonOptions & {
    recursive?: boolean;
} = {}): AsyncIterable<DirEntry> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readTree(
    target: string | FileSystemDirectoryHandle,
    options: CommonOptions = {}
): Promise<DirTree> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readFile(target: string | FileSystemFileHandle, options: CommonOptions & {
    signal?: AbortSignal;
} = {}): Promise<Uint8Array> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readFileAsText(target: string | FileSystemFileHandle, options: CommonOptions & {
    signal?: AbortSignal;
} = {}): Promise<string> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function writeFile(target: string | FileSystemFileHandle,
    data: Uint8Array | string,
    options: CommonOptions & {
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
    options: CommonOptions & {
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
    options: CommonOptions = {}
): Promise<void> {
    void target, size, options;
    throw new Error("Unsupported runtime");
}

export async function remove(path: string, options: CommonOptions & {
    recursive?: boolean;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function rename(
    oldPath: string,
    newPath: string,
    options: CommonOptions = {}
): Promise<void> {
    void oldPath, newPath, options;
    throw new Error("Unsupported runtime");
}

export async function copy(
    oldPath: string,
    newPath: string,
    options: CommonOptions = {}
): Promise<void> {
    void oldPath, newPath, options;
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
