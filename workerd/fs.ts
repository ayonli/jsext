import { CommonOptions, FileInfo, DirEntry } from "../fs/types";

export { CommonOptions, FileInfo, DirEntry };

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

export async function* readDir(target: string | FileSystemDirectoryHandle, options: CommonOptions & {
    recursive?: boolean;
} = {}): AsyncIterable<DirEntry> {
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
