import { concat as concatBytes } from "../bytes.ts";
import { createReadableStream, createWritableStream, ensureDir } from "../fs.ts";
import { dirname, join, resolve } from "../path.ts";
import Tarball, { HEADER_LENGTH, USTarFileHeader, createEntry, parseHeader } from "./Tarball.ts";
import { TarOptions } from "./tar.ts";

/**
 * Loads the specified tarball file and creates a {@link Tarball} instance.
 */
export default function untar(
    src: string | FileSystemFileHandle | ReadableStream<Uint8Array>,
    options?: TarOptions
): Promise<Tarball>;
/**
 * Extracts files from a tarball file and writes them to the specified directory.
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

    const { signal } = options;
    const input = src instanceof ReadableStream ? src : createReadableStream(src, options);

    signal?.addEventListener("abort", () => {
        input.cancel(signal.reason);
    });

    if (!_dest) {
        return await Tarball.load(input, options);
    }

    const reader = input.getReader();
    let lastChunk: Uint8Array = new Uint8Array(0);
    let headerInfo: USTarFileHeader | null = null;
    let writer: WritableStreamDefaultWriter<Uint8Array> | undefined;
    let writtenBytes = 0;
    let paddingSize = 0;

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            reader.releaseLock();
            break;
        }

        lastChunk = lastChunk.byteLength ? concatBytes(lastChunk, value) : value;

        if (paddingSize > 0 && lastChunk.byteLength >= paddingSize) {
            lastChunk = lastChunk.subarray(paddingSize);
            paddingSize = 0;
        }

        while (true) {
            if (!headerInfo) {
                if (lastChunk.byteLength >= HEADER_LENGTH) {
                    [headerInfo, lastChunk] = parseHeader(lastChunk);
                } else {
                    break;
                }
            }

            const info = createEntry(headerInfo);
            const fileSize = info.size;

            if (writer) {
                const chunk = lastChunk.subarray(0, fileSize - writtenBytes);
                await writer.write(chunk);
                lastChunk = lastChunk.subarray(fileSize - writtenBytes);
                writtenBytes += chunk.byteLength;
            } else if (info.kind === "directory") {
                if (typeof FileSystemDirectoryHandle === "function" &&
                    _dest instanceof FileSystemDirectoryHandle
                ) {
                    await ensureDir(info.relativePath, {
                        ...options,
                        root: _dest,
                        mode: info.mode,
                    });
                } else {
                    await ensureDir(join(_dest as string, info.relativePath), {
                        ...options,
                        mode: info.mode,
                    });
                }
            } else {
                let filename: string;
                let _options = options;

                if (typeof FileSystemDirectoryHandle === "function" &&
                    _dest instanceof FileSystemDirectoryHandle
                ) {
                    _options = { ...options, root: _dest };
                    filename = info.relativePath;
                } else {
                    filename = join(_dest as string, info.relativePath);
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

                writtenBytes = 0;
                headerInfo = null;
                writer?.close();
                writer = undefined;
            } else {
                break;
            }
        }
    }
}
