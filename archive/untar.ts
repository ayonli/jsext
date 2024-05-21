import { concat as concatBytes } from "../bytes.ts";
import { isDeno, isNodeLike } from "../env.ts";
import { chmod, chown, createReadableStream, createWritableStream, ensureDir, utimes } from "../fs.ts";
import { dirname, join, resolve } from "../path.ts";
import Tarball, { HEADER_LENGTH, TarEntry, USTarFileHeader, createEntry, parseHeader } from "./Tarball.ts";
import { TarOptions } from "./tar.ts";

/**
 * Loads the specified tarball file to a {@link Tarball} instance.
 */
export default function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    options?: TarOptions
): Promise<Tarball>;
/**
 * Extracts files from a tarball file and writes them to the specified directory.
 * 
 * NOTE: If the destination directory does not exist, it will be created.
 */
export default function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    dest: string | FileSystemDirectoryHandle,
    options?: TarOptions
): Promise<void>;
export default async function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    dest: string | FileSystemDirectoryHandle | TarOptions = {},
    options: TarOptions = {}
): Promise<Tarball | void> {
    src = typeof src === "string" ? resolve(src) : src;
    let _dest: string | FileSystemDirectoryHandle | undefined = undefined;

    if (typeof dest === "string") {
        _dest = resolve(dest);
    } else if (typeof dest === "object") {
        if (typeof FileSystemDirectoryHandle === "function" &&
            dest instanceof FileSystemDirectoryHandle
        ) {
            _dest = dest;
        } else {
            options = dest as TarOptions;
        }
    }

    let input = src instanceof ReadableStream ? src : createReadableStream(src, options);

    if (options.gzip) {
        const gzip = new DecompressionStream("gzip");
        input = input.pipeThrough<Uint8Array>(gzip);
    }

    const { signal } = options;
    signal?.addEventListener("abort", () => {
        input.cancel(signal.reason);
    });

    if (!_dest) {
        return await Tarball.load(input);
    }

    const reader = input.getReader();
    let lastChunk: Uint8Array = new Uint8Array(0);
    let rawHeader: USTarFileHeader | null = null;
    let entry: TarEntry | null = null;
    let filename: string | undefined = undefined;
    let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
    let writtenBytes = 0;
    let paddingSize = 0;

    try {
        outer:
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            lastChunk = lastChunk.byteLength ? concatBytes(lastChunk, value) : value;

            if (paddingSize > 0 && lastChunk.byteLength >= paddingSize) {
                lastChunk = lastChunk.subarray(paddingSize);
                paddingSize = 0;
            }

            while (true) {
                if (!rawHeader) {
                    if (lastChunk.byteLength >= HEADER_LENGTH) {
                        const _header = parseHeader(lastChunk);

                        if (_header) {
                            [rawHeader, lastChunk] = _header;
                        } else {
                            lastChunk = new Uint8Array(0);
                            break outer;
                        }
                    } else {
                        break;
                    }
                }

                entry ??= createEntry(rawHeader);
                const fileSize = entry.size;

                if (writer) {
                    const chunk = lastChunk.subarray(0, fileSize - writtenBytes);
                    await writer.write(chunk);
                    lastChunk = lastChunk.subarray(fileSize - writtenBytes);
                    writtenBytes += chunk.byteLength;
                } else if (entry.kind === "directory") {
                    if (typeof FileSystemDirectoryHandle === "function" &&
                        _dest instanceof FileSystemDirectoryHandle
                    ) {
                        await ensureDir(entry.relativePath, {
                            ...options,
                            root: _dest,
                            mode: entry.mode,
                        });
                    } else {
                        filename = join(_dest as string, entry.relativePath);
                        await ensureDir(filename, {
                            ...options,
                            mode: entry.mode,
                        });
                    }
                } else {
                    let _options = options;

                    if (typeof FileSystemDirectoryHandle === "function" &&
                        _dest instanceof FileSystemDirectoryHandle
                    ) {
                        _options = { ...options, root: _dest };
                        filename = entry.relativePath;
                    } else {
                        filename = join(_dest as string, entry.relativePath);
                    }

                    await ensureDir(dirname(filename), _options);

                    const output = createWritableStream(filename, _options);
                    writer = output.getWriter();
                    continue;
                }

                if (writtenBytes === fileSize) {
                    paddingSize = HEADER_LENGTH - (fileSize % HEADER_LENGTH || HEADER_LENGTH);

                    if (paddingSize && lastChunk.byteLength >= paddingSize) {
                        lastChunk = lastChunk.subarray(paddingSize);
                        paddingSize = 0;
                    }

                    if ((isDeno || isNodeLike) && filename) {
                        if (entry.mode) {
                            await chmod(filename, entry.mode);
                        }

                        if (entry.uid || entry.gid) {
                            await chown(filename, entry.uid || 0, entry.gid || 0);
                        }

                        if (entry.mtime) {
                            await utimes(filename, entry.mtime, entry.mtime);
                        }
                    }

                    writtenBytes = 0;
                    rawHeader = null;
                    writer?.close();
                    writer = undefined;
                    filename = undefined;
                    entry = null;
                } else {
                    break;
                }
            }
        }

        if (lastChunk.byteLength) {
            throw new Error("The archive is corrupted");
        }
    } finally {
        reader.releaseLock();
    }
}
