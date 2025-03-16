import Tarball, { FilenameTooLongError, type TarEntry, type TarTree } from "../archive/Tarball.ts";
import type { TarOptions } from "../archive/tar.ts";
import type { UntarOptions } from "../archive/untar.ts";
import type { FileSystemOptions } from "../fs/types.ts";
import { NotImplementedError } from "../error.ts";

export { Tarball, FilenameTooLongError };
export type { TarEntry, TarOptions, UntarOptions, TarTree };

export function tar(
    src: string | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle,
    options?: TarOptions
): Promise<void>;
export function tar(
    src: string | FileSystemDirectoryHandle,
    options?: FileSystemOptions
): Promise<Tarball>;
export async function tar(
    src: string | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle | TarOptions = {},
    options: TarOptions = {}
): Promise<Tarball | void> {
    void src, dest, options;
    throw new NotImplementedError("Unsupported runtime");
}

export function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    dest: string | FileSystemDirectoryHandle,
    options?: UntarOptions
): Promise<void>;
export function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    options?: TarOptions
): Promise<Tarball>;
export async function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    dest: string | FileSystemDirectoryHandle | TarOptions = {},
    options: UntarOptions = {}
): Promise<Tarball | void> {
    void src, dest, options;
    throw new NotImplementedError("Unsupported runtime");
}
