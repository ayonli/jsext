import bytes, { concat as concat$1 } from '../bytes.js';
import { omit } from '../object.js';
import Exception from '../error/Exception.js';
import { makeTree } from '../fs/util.js';
import { dirname, basename } from '../path.js';
import { toReadableStream, concat } from '../reader.js';
import { stripEnd } from '../string.js';

var _a;
var FileTypes;
(function (FileTypes) {
    FileTypes[FileTypes["file"] = 0] = "file";
    FileTypes[FileTypes["link"] = 1] = "link";
    FileTypes[FileTypes["symlink"] = 2] = "symlink";
    FileTypes[FileTypes["character-device"] = 3] = "character-device";
    FileTypes[FileTypes["block-device"] = 4] = "block-device";
    FileTypes[FileTypes["directory"] = 5] = "directory";
    FileTypes[FileTypes["fifo"] = 6] = "fifo";
    FileTypes[FileTypes["contiguous-file"] = 7] = "contiguous-file";
})(FileTypes || (FileTypes = {}));
const HEADER_LENGTH = 512;
const USTAR_MAGIC_HEADER = "ustar\x00";
const USTarFileHeaderFieldLengths = {
    name: 100, // 0
    mode: 8, // 100
    uid: 8, // 108
    gid: 8, // 116
    size: 12, // 124
    mtime: 12, // 136
    checksum: 8, // 148
    typeflag: 1, // 156
    linkname: 100, // 157
    magic: 6, // 257
    version: 2, // 263
    uname: 32, // 265
    gname: 32, // 297
    devmajor: 8, // 329
    devminor: 8, // 337
    prefix: 155, // 345
    padding: 12, // 500
};
// https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html#tag_20_92_13_06
// eight checksum bytes taken to be ascii spaces (decimal value 32)
const initialChecksum = 8 * 32;
const FilenameTooLongError = new Exception("UStar format does not allow a long file name (length of [file name"
    + "prefix] + / + [file name] must be shorter than 256 bytes)", {
    name: "FilenameTooLongError",
    code: 431
});
function toFixedOctal(num, bytes) {
    return num.toString(8).padStart(bytes, "0");
}
function trimBytes(data) {
    const index = data.indexOf(0);
    return index === -1 ? data : data.subarray(0, index);
}
function formatHeader(data) {
    const buffer = new Uint8Array(HEADER_LENGTH);
    let offset = 0;
    for (const [field, length] of Object.entries(USTarFileHeaderFieldLengths)) {
        const entry = bytes(data[field] || "");
        buffer.set(entry, offset);
        offset += length;
    }
    return buffer;
}
function parseHeader(header) {
    const decoder = new TextDecoder();
    const data = {};
    let offset = 0;
    for (const [field, length] of Object.entries(USTarFileHeaderFieldLengths)) {
        let buffer = header.subarray(offset, offset + length);
        if (field !== "magic") {
            buffer = trimBytes(buffer);
        }
        const value = decoder.decode(buffer).trim();
        data[field] = value;
        offset += length;
    }
    // validate checksum
    const checksum = getChecksum(header);
    if (checksum !== parseInt(data.checksum, 8)) {
        if (checksum === initialChecksum) {
            // EOF
            return null;
        }
        throw new Error("The archive is corrupted");
    }
    if (!data.magic.startsWith("ustar")) {
        throw new TypeError("Unsupported archive format: " + data.magic);
    }
    return [data, header.subarray(offset)];
}
function getChecksum(header) {
    let sum = initialChecksum;
    for (let i = 0; i < HEADER_LENGTH; i++) {
        if (i >= 148 && i < 156) {
            // Ignore checksum header
            continue;
        }
        sum += header[i];
    }
    return sum;
}
function createEntry(headerInfo) {
    var _b;
    const relativePath = (headerInfo.prefix ? headerInfo.prefix + "/" : "")
        + stripEnd(headerInfo.name, "/");
    return {
        name: basename(relativePath),
        kind: ((_b = FileTypes[parseInt(headerInfo.typeflag)]) !== null && _b !== void 0 ? _b : "file"),
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
class Tarball {
    constructor() {
        this[_a] = [];
        if (typeof ReadableStream === "undefined") {
            throw new TypeError("ReadableStream is not supported in this environment");
        }
    }
    append(data, info = {}) {
        var _b, _c, _d, _e, _f;
        if (data === null) {
            if (info.kind === "directory") {
                data = new Uint8Array(0);
            }
            else {
                throw new TypeError("data must be provided for files");
            }
        }
        let relativePath = info.relativePath;
        if (!relativePath) {
            if (typeof File === "function" && data instanceof File) {
                relativePath = (data.webkitRelativePath || data.name);
            }
            else {
                throw new TypeError("info.relativePath must be provided");
            }
        }
        const dir = dirname(relativePath).replace(/\\/g, "/");
        const fileName = info.name
            || (typeof File === "function" && data instanceof File
                ? data.name
                : basename(relativePath));
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
        let name = relativePath;
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
            }
            else if (prefix.length > 155) {
                throw FilenameTooLongError;
            }
        }
        let body;
        let size = 0;
        if (typeof data === "string") {
            const _data = bytes(data);
            body = toReadableStream([_data]);
            size = _data.byteLength;
        }
        else if (data instanceof Uint8Array) {
            body = toReadableStream([data]);
            size = data.byteLength;
        }
        else if (data instanceof ArrayBuffer) {
            body = toReadableStream([new Uint8Array(data)]);
            size = data.byteLength;
        }
        else if (data instanceof DataView) {
            const _data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            body = toReadableStream([_data]);
            size = _data.byteLength;
        }
        else if (typeof Blob === "function" && data instanceof Blob) {
            body = data.stream();
            size = data.size;
        }
        else if (data instanceof ReadableStream) {
            body = data;
            if (info.size != undefined) {
                size = info.size;
            }
            else {
                throw new TypeError("size must be provided for ReadableStream data");
            }
        }
        else {
            throw new TypeError("data must be a string, Uint8Array, ArrayBuffer, DataView, Blob, or ReadableStream");
        }
        const kind = (_b = info.kind) !== null && _b !== void 0 ? _b : "file";
        const mode = (_c = info.mode) !== null && _c !== void 0 ? _c : (kind === "directory" ? 0o755 : 0o666);
        const mtime = (_d = info.mtime) !== null && _d !== void 0 ? _d : new Date();
        if (kind === "directory") {
            size = 0; // ensure size is 0 for directories
        }
        const headerInfo = {
            name,
            mode: toFixedOctal(mode, USTarFileHeaderFieldLengths.mode),
            uid: toFixedOctal((_e = info.uid) !== null && _e !== void 0 ? _e : 0, USTarFileHeaderFieldLengths.uid),
            gid: toFixedOctal((_f = info.gid) !== null && _f !== void 0 ? _f : 0, USTarFileHeaderFieldLengths.gid),
            size: toFixedOctal(size, USTarFileHeaderFieldLengths.size),
            mtime: toFixedOctal(Math.floor((mtime.getTime()) / 1000), USTarFileHeaderFieldLengths.mtime),
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
        Object.values(headerInfo).forEach((data) => {
            checksum += encoder.encode(data).reduce((p, c) => p + c, 0);
        });
        headerInfo.checksum = toFixedOctal(checksum, USTarFileHeaderFieldLengths.checksum);
        const header = formatHeader(headerInfo);
        this[_entries].push({
            name: fileName,
            kind,
            relativePath,
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
    [(_a = _entries, Symbol.iterator)]() {
        return this.entries();
    }
    /**
     * Iterates over the entries in the archive.
     */
    *entries() {
        const iter = this[_entries][Symbol.iterator]();
        for (const entry of iter) {
            yield omit(entry, ["header", "body"]);
        }
    }
    /**
     * Returns a tree view of the entries in the archive.
     *
     * NOTE: The entries returned by this function are reordered first by kind
     * (directories before files), then by names alphabetically.
     */
    treeView() {
        const now = new Date();
        const entries = [...this.entries()];
        const { children, ...rest } = makeTree("", entries);
        return {
            ...rest,
            size: 0,
            mtime: now,
            mode: 0o755,
            uid: 0,
            gid: 0,
            owner: "",
            group: "",
            children: children !== null && children !== void 0 ? children : [],
        };
    }
    /**
     * Returns a readable stream of the archive that can be piped to a writable
     * target.
     */
    stream(options = {}) {
        const streams = [];
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
            return stream.pipeThrough(gzip);
        }
        else {
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
    static async load(stream, options = {}) {
        if (options.gzip) {
            const gzip = new DecompressionStream("gzip");
            stream = stream.pipeThrough(gzip);
        }
        const tarball = new Tarball();
        const reader = stream.getReader();
        let lastChunk = new Uint8Array(0);
        let rawHeader = null;
        try {
            outer: while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                lastChunk = lastChunk.byteLength ? concat$1(lastChunk, value) : value;
                while (true) {
                    if (!rawHeader) {
                        if (lastChunk.byteLength >= HEADER_LENGTH) {
                            const _header = parseHeader(lastChunk);
                            if (_header) {
                                [rawHeader, lastChunk] = _header;
                            }
                            else {
                                lastChunk = new Uint8Array(0);
                                break outer;
                            }
                        }
                        else {
                            break;
                        }
                    }
                    const fileSize = parseInt(rawHeader.size, 8);
                    if (lastChunk.byteLength >= fileSize) {
                        const data = lastChunk.slice(0, fileSize); // use slice to make a copy
                        const entry = {
                            ...createEntry(rawHeader),
                            header: formatHeader(rawHeader),
                            body: toReadableStream([data]),
                        };
                        tarball[_entries].push(entry);
                        const paddingSize = HEADER_LENGTH - (fileSize % HEADER_LENGTH || HEADER_LENGTH);
                        if (paddingSize > 0) {
                            lastChunk = lastChunk.subarray(fileSize + paddingSize);
                        }
                        else {
                            lastChunk = lastChunk.subarray(fileSize);
                        }
                        rawHeader = null;
                    }
                    else {
                        break;
                    }
                }
            }
            if (lastChunk.byteLength) {
                throw new Error("The archive is corrupted");
            }
            return tarball;
        }
        finally {
            reader.releaseLock();
        }
    }
}

export { HEADER_LENGTH, _entries, createEntry, Tarball as default, parseHeader };
//# sourceMappingURL=Tarball.js.map
