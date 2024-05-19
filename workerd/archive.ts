import Tarball, { TarEntry, TarEntryInfo } from "../archive/Tarball.ts";

export { Tarball };
export type { TarEntry, TarEntryInfo };

export type TarOptions = {
    gzip?: boolean;
    signal?: AbortSignal;
};

export function tar(
    src: string | FileSystemDirectoryHandle,
    options?: TarOptions
): Promise<Tarball>;
export function tar(
    src: string | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle,
    options?: TarOptions
): Promise<void>;
export async function tar(
    src: string | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle | TarOptions = {},
    options: TarOptions = {}
): Promise<Tarball | void> {
    void src, dest, options;
    throw new Error("Unsupported runtime");
}

export function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    options?: TarOptions
): Promise<Tarball>;
export function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    dest: string | FileSystemDirectoryHandle,
    options?: TarOptions
): Promise<void>;
export async function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    dest: string | FileSystemDirectoryHandle | TarOptions = {},
    options: TarOptions = {}
): Promise<Tarball | void> {
    void src, dest, options;
    throw new Error("Unsupported runtime");
}
