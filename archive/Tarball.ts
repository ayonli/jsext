import bytes, { concat as concatBytes } from "../bytes.ts";
import { Exception } from "../error.ts";
import { omit } from "../object.ts";
import { basename, dirname } from "../path.ts";
import { concat, toReadableStream } from "../reader.ts";
import { Ensured } from "../types.ts";

export interface TarEntryInfo {
    name: string;
    kind: "file"
    | "link"
    | "symlink"
    | "character-device"
    | "block-device"
    | "directory"
    | "fifo"
    | "contiguous-file";
    /**
    * The relative path of the entry.
    */
    relativePath: string;
    /**
     * The size of the file in bytes. This value may be `0` if this is a
     * directory.
     */
    size: number;
    /**
     * The last modified time of the file.
     */
    mtime: Date;
    mode: number;
    /**
     * User ID of the owner of the file. This value may be `0` on unsupported
     * platforms.
     */
    uid: number;
    /**
     * Group ID of the owner of the file. This value may be `0` on unsupported
     * platforms.
     */
    gid: number;
    /**
     * The owner's name of the file. This value may be an empty string on
     * unsupported platforms.
     */
    owner: string;
    /**
     * The group's name of the file. This value may be an empty string on
     * unsupported platforms.
     */
    group: string;
}

export interface TarEntry extends TarEntryInfo {
    stream: ReadableStream<Uint8Array>;
}

interface TarEntryWithData extends TarEntryInfo {
    header: Uint8Array;
    body: ReadableStream<Uint8Array>;
}

enum FileTypes {
    "file" = 0,
    "link" = 1,
    "symlink" = 2,
    "character-device" = 3,
    "block-device" = 4,
    "directory" = 5,
    "fifo" = 6,
    "contiguous-file" = 7,
}

const USTAR_MAGIC_HEADER = "ustar\x00";
const HEADER_LENGTH = 512;

export interface USTarFileHeader {
    name: string;
    mode: string;
    uid: string;
    gid: string;
    size: string;
    mtime: string;
    checksum: string;
    typeflag: string;
    linkname: string;
    magic: string;
    version: string;
    uname: string;
    gname: string;
    devmajor: string;
    devminor: string;
    prefix: string;
}

const USTarFileHeaderFieldLengths = { // byte offset
    name: 100,                // 0
    mode: 8,                  // 100
    uid: 8,                   // 108
    gid: 8,                   // 116
    size: 12,                 // 124
    mtime: 12,                // 136
    checksum: 8,              // 148
    typeflag: 1,              // 156
    linkname: 100,            // 157
    magic: 6,                 // 257
    version: 2,               // 263
    uname: 32,                // 265
    gname: 32,                // 297
    devmajor: 8,              // 329
    devminor: 8,              // 337
    prefix: 155,              // 345
    padding: 12,              // 500
};

// https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html#tag_20_92_13_06
// eight checksum bytes taken to be ascii spaces (decimal value 32)
const initialChecksum = 8 * 32;

const FilenameTooLongError = new Exception(
    "UStar format does not allow a long file name (length of [file name"
    + "prefix] + / + [file name] must be shorter than 256 bytes)", {
    name: "FilenameTooLongError",
    code: 431
});

function pad(num: number, bytes: number): string {
    return num.toString(8).padStart(bytes, "0");
}

function trimBytes(data: Uint8Array): Uint8Array {
    const index = data.indexOf(0);
    return index === -1 ? data : data.subarray(0, index);
}

function formatHeader(data: USTarFileHeader): Uint8Array {
    const buffer = new Uint8Array(HEADER_LENGTH);
    let offset = 0;

    for (const [field, length] of Object.entries(USTarFileHeaderFieldLengths)) {
        const entry = bytes(data[field as keyof USTarFileHeader] || "");
        buffer.set(entry, offset);
        offset += length;
    }

    return buffer;
}

function parseHeader(header: Uint8Array): [USTarFileHeader, leftChunk: Uint8Array] {
    const decoder = new TextDecoder();
    const data: USTarFileHeader = {} as USTarFileHeader;
    let offset = 0;

    for (const [field, length] of Object.entries(USTarFileHeaderFieldLengths)) {
        let buffer = header.subarray(offset, offset + length);

        if (field !== "magic") {
            buffer = trimBytes(buffer);
        }

        const value = decoder.decode(buffer).trim();
        data[field as keyof USTarFileHeader] = value;
        offset += length;
    }

    // validate checksum
    if (parseInt(data.checksum, 8) !== getChecksum(header)) {
        throw new Error("The archive is corrupted");
    }

    if (!data.magic.startsWith("ustar")) {
        throw new Error("Unsupported archive format: " + data.magic);
    }

    return [data, header.subarray(offset)];
}

function getChecksum(header: Uint8Array): number {
    let sum = initialChecksum;
    for (let i = 0; i < HEADER_LENGTH; i++) {
        if (i >= 148 && i < 156) {
            // Ignore checksum header
            continue;
        }
        sum += header[i]!;
    }
    return sum;
}

export function createEntry(headerInfo: USTarFileHeader): TarEntryInfo {
    const relativePath = (headerInfo.prefix ? headerInfo.prefix + "/" : "") + headerInfo.name;
    return {
        name: basename(relativePath),
        kind: (FileTypes[parseInt(headerInfo.typeflag)] ?? "file") as TarEntryInfo["kind"],
        relativePath,
        size: parseInt(headerInfo.size, 8),
        mtime: new Date(parseInt(headerInfo.mtime, 8) * 1000),
        mode: parseInt(headerInfo.mode, 8),
        uid: parseInt(headerInfo.uid, 8),
        gid: parseInt(headerInfo.gid, 8),
        owner: headerInfo.uname.trim(),
        group: headerInfo.gname.trim(),
    };
}

const _entries = Symbol.for("entries");

/**
 * A `Tarball` instance represents a tar archive.
 * 
 * @example
 * ```ts
 * // create a tarball
 * import { stat, createReadableStream, createWriteableStream } from "@ayonli/jsext/fs";
 * import { Tarball } from "@ayonli/jsext/archive";
 * 
 * const tarball = new Tarball();
 * 
 * const file1 = await stat("foo.txt");
 * const stream1 = createReadableStream("foo.txt");
 * tarball.append(stream1, { relativePath: "foo.txt", size: file1.size });
 * 
 * const file2 = await stat("bar.txt");
 * const stream2 = createReadableStream("bar.txt");
 * tarball.append(stream2, { relativePath: "bar.txt", size: file2.size });
 * 
 * const output = createWritableStream("archive.tar");
 * await tarball.stream().pipeTo(output);
 * ```
 * 
 * @example
 * ```ts
 * // load a tarball
 * import { createReadableStream } from "@ayonli/jsext/fs";
 * import { Tarball } from "@ayonli/jsext/archive";
 * 
 * const input = createReadableStream("archive.tar");
 * const tarball = await Tarball.load(input);
 * 
 * for (const entry of tarball) {
 *     console.log(entry);
 * }
 * ```
 */
export default class Tarball {
    private [_entries]: TarEntryWithData[] = [];

    constructor() {
        if (typeof ReadableStream === "undefined") {
            throw new TypeError("ReadableStream is not supported in this environment");
        }
    }

    /**
     * Appends a file to the archive.
     * @param data The file data, can be `null` if the file info represents a directory.
     */
    append(
        data: string | Uint8Array | ArrayBufferLike | DataView | Blob | ReadableStream<Uint8Array> | null,
        info: Ensured<Partial<TarEntryInfo>, "relativePath">
    ): void {
        if (data === null) {
            if (info.kind === "directory") {
                data = new Uint8Array(0);
            } else {
                throw new TypeError("data must be provided for files");
            }
        }

        const dir = dirname(info.relativePath);
        const fileName = info.name
            || (typeof File === "function" && data instanceof File
                ? data.name
                : basename(info.relativePath));

        // If the input path has parent directories that are not in the archive,
        // we need to add them first.
        if (dir && dir !== "." && !this[_entries].some((entry) => entry.relativePath === dir)) {
            this.append(null, {
                kind: "directory",
                relativePath: dir,
            });
        }

        // UStar format has a limitation of file name length. Specifically:
        // 
        // 1. File names can contain at most 255 bytes.
        // 2. File names longer than 100 bytes must be split at a directory separator in two parts,
        //   the first being at most 155 bytes long. So, in most cases file names must be a bit shorter
        //   than 255 bytes.
        // 
        // So we need to separate file name into two parts if needed.
        let name = info.relativePath;
        let prefix = "";

        if (name.length > 100) {
            let i = name.length;

            while (i >= 0) {
                i = name.lastIndexOf("/", i);
                if (i <= 155) {
                    prefix = name.slice(0, i);
                    name = name.slice(i + 1);
                    break;
                }
                i--;
            }

            if (i < 0 || name.length > 100) {
                throw FilenameTooLongError;
            } else if (prefix.length > 155) {
                throw FilenameTooLongError;
            }
        }

        let body: ReadableStream<Uint8Array>;
        let size = 0;

        if (typeof data === "string") {
            const _data = bytes(data);
            body = toReadableStream([_data]);
            size = _data.byteLength;
        } else if (data instanceof Uint8Array) {
            body = toReadableStream([data]);
            size = data.byteLength;
        } else if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
            body = toReadableStream([new Uint8Array(data)]);
            size = data.byteLength;
        } else if (data instanceof DataView) {
            const _data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            body = toReadableStream([_data]);
            size = _data.byteLength;
        } else if (typeof Blob === "function" && data instanceof Blob) {
            body = data.stream();
            size = data.size;
        } else if (data instanceof ReadableStream) {
            body = data;

            if (info.size != undefined) {
                size = info.size;
            } else {
                throw new TypeError("size must be provided for ReadableStream data");
            }
        } else {
            throw new TypeError("data must be a string, Uint8Array, ArrayBuffer, DataView, Blob, or ReadableStream");
        }

        const kind = info.kind ?? "file";
        const mode = info.mode ?? (kind === "directory" ? 0o755 : 0o666);
        const mtime = info.mtime ?? new Date();
        const headerInfo: USTarFileHeader = {
            name,
            mode: pad(mode, USTarFileHeaderFieldLengths.mode),
            uid: pad(info.uid ?? 0, USTarFileHeaderFieldLengths.uid),
            gid: pad(info.gid ?? 0, USTarFileHeaderFieldLengths.gid),
            size: pad(size, USTarFileHeaderFieldLengths.size),
            mtime: pad(Math.floor((mtime.getTime()) / 1000), USTarFileHeaderFieldLengths.mtime),
            checksum: "        ",
            typeflag: kind in FileTypes ? String(FileTypes[kind]) : "0",
            linkname: kind === "link" || kind === "symlink" ? name : "",
            magic: USTAR_MAGIC_HEADER,
            version: "00",
            uname: info.owner || "",
            gname: info.group || "",
            devmajor: "00000000",
            devminor: "00000000",
            prefix,
        };

        // calculate the checksum
        let checksum = 0;
        const encoder = new TextEncoder();
        Object.values(headerInfo).forEach((data: string) => {
            checksum += encoder.encode(data).reduce((p, c): number => p + c, 0);
        });

        headerInfo.checksum = pad(checksum, USTarFileHeaderFieldLengths.checksum);
        const header = formatHeader(headerInfo);

        this[_entries].push({
            name: fileName,
            kind,
            relativePath: info.relativePath,
            size,
            mtime,
            mode,
            uid: info.uid || 0,
            gid: info.gid || 0,
            owner: info.owner || "",
            group: info.group || "",
            header,
            body,
        });
    }

    *entries(): IterableIterator<TarEntry> {
        const iter = this[_entries][Symbol.iterator]();

        for (const entry of iter) {
            yield {
                ...omit(entry, ["header", "body"]),
                stream: entry.body,
            };
        }
    }

    [Symbol.iterator]() {
        return this.entries();
    }

    /**
     * Returns a readable stream of the archive that can be piped to a writable
     * target.
     */
    stream(options: {
        /**
         * Compress the archive using gzip.
         */
        gzip?: boolean;
    } = {}): ReadableStream<Uint8Array> {
        const streams: ReadableStream<Uint8Array>[] = [];

        for (const { size, header, body } of this[_entries]) {
            streams.push(toReadableStream([header]));
            streams.push(body);

            const paddingSize = HEADER_LENGTH - (size % HEADER_LENGTH || HEADER_LENGTH);
            if (paddingSize > 0) {
                streams.push(toReadableStream([new Uint8Array(paddingSize)]));
            }
        }

        const stream = concat(...streams);

        if (options.gzip) {
            const gzip = new CompressionStream("gzip");
            return stream.pipeThrough<Uint8Array>(gzip);
        } else {
            return stream;
        }
    }

    /**
     * Loads a tar archive from a readable stream.
     * 
     * NOTE: This function loads the entire archive into memory, so it is not
     * suitable for large archives. For large archives, use the `untar` function
     * to extract files to the file system instead.
     */
    static async load(stream: ReadableStream<Uint8Array>, options: {
        /**
         * Decompress the archive using gzip.
         */
        gzip?: boolean;
    } = {}): Promise<Tarball> {
        if (options.gzip) {
            const gzip = new DecompressionStream("gzip");
            stream = stream.pipeThrough<Uint8Array>(gzip);
        }

        const tarball = new Tarball();
        const reader = stream.getReader();
        let lastChunk: Uint8Array = new Uint8Array(0);
        let headerInfo: USTarFileHeader | null = null;

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                reader.releaseLock();
                break;
            }

            lastChunk = lastChunk.byteLength ? concatBytes(lastChunk, value) : value;

            while (true) {
                if (!headerInfo) {
                    if (lastChunk.byteLength >= HEADER_LENGTH) {
                        [headerInfo, lastChunk] = parseHeader(lastChunk);
                    } else {
                        break;
                    }
                }

                const fileSize = parseInt(headerInfo.size, 8);

                if (lastChunk.byteLength >= fileSize) {
                    const data = lastChunk.slice(0, fileSize); // use slice to make a copy
                    const entry = {
                        ...createEntry(headerInfo),
                        header: formatHeader(headerInfo),
                        body: toReadableStream([data]),
                    };
                    tarball[_entries].push(entry);

                    const paddingSize = HEADER_LENGTH - (fileSize % HEADER_LENGTH || HEADER_LENGTH);
                    if (paddingSize > 0) {
                        lastChunk = lastChunk.subarray(fileSize + paddingSize);
                    } else {
                        lastChunk = lastChunk.subarray(fileSize);
                    }

                    headerInfo = null;
                } else {
                    break;
                }
            }
        }

        return tarball;
    }
}
