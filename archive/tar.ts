import { CommonOptions, createReadableStream, stat, readDir, FileInfo, createWritableStream } from "../fs.ts";
import { basename, join, resolve } from "../path.ts";
import Tarball from "./Tarball.ts";

export type TarOptions = CommonOptions & {
    gzip?: boolean;
    signal?: AbortSignal;
};

/**
 * Creates a {@link Tarball} instance and puts the the specified directory into
 * the archive.
 * 
 * NOTE: This function puts the directory itself into the archive, similar to
 * `tar -cf archive.tar <directory>` in Unix-like systems.
 */
export default function tar(
    src: string | FileSystemDirectoryHandle,
    options?: TarOptions
): Promise<Tarball>;
/**
 * Archives the specified directory and puts it to the specified tarball file.
 * 
 * NOTE: This function puts the directory itself into the archive, similar to
 * `tar -cf archive.tar <directory>` in Unix-like systems.
 */
export default function tar(
    src: string | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle,
    options?: TarOptions
): Promise<void>;
export default async function tar(
    src: string | FileSystemDirectoryHandle,
    dest: string | FileSystemFileHandle | TarOptions = {},
    options: TarOptions = {}
): Promise<Tarball | void> {
    src = typeof src === "string" ? resolve(src) : src;
    let _dest: string | FileSystemFileHandle | undefined = undefined;

    if (typeof dest === "string") {
        _dest = resolve(dest);
    } else if (typeof dest === "object") {
        if (typeof FileSystemFileHandle === "function" && dest instanceof FileSystemFileHandle) {
            _dest = dest;
        } else {
            options = dest as TarOptions;
        }
    }

    const { signal } = options;
    const baseDir = typeof src === "string" ? basename(src) : src.name;
    const entries = readDir(src, { ...options, recursive: true });
    const tarball = new Tarball();

    for await (const entry of entries) {
        let filename: string;
        let info: FileInfo;
        let stream: ReadableStream<Uint8Array> | null = null;

        if (entry.handle) {
            filename = entry.relativePath;
            info = await stat(entry.handle);
        } else if (typeof src === "string") {
            filename = join(src, entry.relativePath);
            info = await stat(filename, options);
        } else {
            filename = entry.relativePath;
            info = await stat(entry.relativePath, options);
        }

        if (info.kind !== "directory") {
            stream = createReadableStream(
                entry.handle as FileSystemFileHandle | null ?? filename,
                options);

            signal?.addEventListener("abort", () => {
                stream!.cancel(signal.reason).catch(() => { });
            }, { once: true });
        }

        tarball.append(stream, {
            name: entry.name,
            kind: entry.kind,
            relativePath: baseDir ? baseDir + "/" + entry.relativePath : entry.relativePath,
            size: entry.kind === "directory" ? 0 : info.size,
            mtime: info.mtime ?? new Date(),
            mode: info.mode,
            uid: info.uid,
            gid: info.gid,
        });
    }

    if (!_dest) {
        return tarball;
    }

    const output = createWritableStream(_dest, options);
    const stream = tarball.stream(options);

    signal?.addEventListener("abort", () => {
        output.abort(signal.reason).catch(() => { });
    }, { once: true });

    await stream.pipeTo(output);
}