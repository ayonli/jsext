import type { FileSystemOptions, FileInfo, DirEntry, DirTree } from "../fs/types";

export type { FileSystemOptions, FileInfo, DirEntry, DirTree };

export const EOL: "\n" | "\r\n" = "\n";

export interface GetDirOptions extends FileSystemOptions {
    create?: boolean;
    recursive?: boolean;
}

export async function getDirHandle(
    path: string,
    options: GetDirOptions = {}
): Promise<FileSystemDirectoryHandle> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export interface GetFileOptions extends FileSystemOptions {
    create?: boolean;
}

export async function getFileHandle(
    path: string,
    options: GetFileOptions = {}
): Promise<FileSystemFileHandle> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function exists(path: string, options: FileSystemOptions = {}): Promise<boolean> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export interface StatOptions extends FileSystemOptions {
    followSymlink?: boolean;
}

export async function stat(
    target: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: StatOptions = {}
): Promise<FileInfo> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export interface MkdirOptions extends FileSystemOptions {
    recursive?: boolean;
    mode?: number;
}

export async function mkdir(path: string, options: MkdirOptions = {}): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}

export async function ensureDir(
    path: string,
    options: Omit<MkdirOptions, "recursive"> = {}
): Promise<void> {
    void path, options;
    throw new Error("Unsupported runtime");
}


export interface ReadDirOptions extends FileSystemOptions {
    recursive?: boolean;
}

export async function* readDir(
    target: string | FileSystemDirectoryHandle,
    options: ReadDirOptions = {}
): AsyncIterableIterator<DirEntry> {
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

export interface ReadFileOptions extends FileSystemOptions {
    signal?: AbortSignal;
}

export async function readFile(
    target: string | FileSystemFileHandle,
    options: ReadFileOptions = {}
): Promise<Uint8Array> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readFileAsText(
    target: string | FileSystemFileHandle,
    options: ReadFileOptions = {}
): Promise<string> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export async function readFileAsFile(
    target: string | FileSystemFileHandle,
    options: ReadFileOptions = {}
): Promise<File> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export interface WriteFileOptions extends FileSystemOptions {
    append?: boolean;
    mode?: number;
    signal?: AbortSignal;
}

export async function writeFile(
    target: string | FileSystemFileHandle,
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    options: WriteFileOptions = {}
): Promise<void> {
    void target, data, options;
    throw new Error("Unsupported runtime");
}

export async function writeLines(
    target: string | FileSystemFileHandle,
    lines: string[],
    options: WriteFileOptions = {}
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

export interface RemoveOptions extends FileSystemOptions {
    recursive?: boolean;
}

export async function remove(path: string, options: RemoveOptions = {}): Promise<void> {
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

export interface CopyOptions extends FileSystemOptions {
    recursive?: boolean;
}

export async function copy(src: string, dest: string, options?: CopyOptions): Promise<void>;
export async function copy(
    src: FileSystemFileHandle,
    dest: FileSystemFileHandle | FileSystemDirectoryHandle
): Promise<void>;
export async function copy(
    src: FileSystemDirectoryHandle,
    dest: FileSystemDirectoryHandle,
    options?: Pick<CopyOptions, "recursive">
): Promise<void>;
export async function copy(
    src: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle | FileSystemDirectoryHandle,
    options: CopyOptions = {}
): Promise<void> {
    void src, dest, options;
    throw new Error("Unsupported runtime");
}


export interface LinkOptions {
    symbolic?: boolean;
}

export async function link(src: string, dest: string, options: LinkOptions = {}): Promise<void> {
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

export function createReadableStream(
    target: string | FileSystemFileHandle,
    options: FileSystemOptions = {}
): ReadableStream<Uint8Array> {
    void target, options;
    throw new Error("Unsupported runtime");
}

export function createWritableStream(
    target: string | FileSystemFileHandle,
    options: Omit<WriteFileOptions, "signal"> = {}
): WritableStream<Uint8Array> {
    void target, options;
    throw new Error("Unsupported runtime");
}
