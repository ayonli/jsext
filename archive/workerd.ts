import { throwUnsupportedRuntimeError } from "@jsext/error";
import type { FileSystemOptions } from "@jsext/fs";
import Tarball, { type TarEntry, type TarTree } from "./Tarball.ts";
import type { TarOptions } from "./tar.ts";
import type { UntarOptions } from "./untar.ts";

export * from "./errors.ts";
export { Tarball };
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
    throwUnsupportedRuntimeError();
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
    throwUnsupportedRuntimeError();
}
