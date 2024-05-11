import { FileInfo, DirEntry } from "../fs/types";

export { FileInfo, DirEntry };

export async function stat(path: string): Promise<FileInfo> {
    void path;
    throw new Error("Unsupported runtime");
}

export async function exists(path: string): Promise<boolean> {
    void path;
    throw new Error("Unsupported runtime");
}

export async function mkdir(path: string, options: {
    recursive?: boolean;
    mode?: number;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function* readDir(path: string, options: {
    recursive?: boolean;
} = {}): AsyncIterable<DirEntry> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function readFile(filename: string, options: {
    signal?: AbortSignal;
} = {}): Promise<Uint8Array> {
    void filename, options;
    throw new Error("Unsupported runtime");
}

export async function readFileAsText(filename: string, options: {
    signal?: AbortSignal;
} = {}): Promise<string> {
    void filename, options;
    throw new Error("Unsupported runtime");
}

export async function writeFile(filename: string, data: Uint8Array | string, options: {
    append?: boolean;
    mode?: number;
    signal?: AbortSignal;
} = {}): Promise<void> {
    void filename, data, options;
    throw new Error("Unsupported runtime");
}

export async function remove(path: string, options: {
    recursive?: boolean;
} = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function rename(oldPath: string, newPath: string): Promise<void> {
    void oldPath, newPath;
    throw new Error("Unsupported runtime");
}

export async function copy(oldPath: string, newPath: string): Promise<void> {
    void oldPath, newPath;
    throw new Error("Unsupported runtime");
}
