import { concat as concat$1 } from '../bytes.js';
import { makeTree } from '../fs/util.js';
import { omit } from '../object.js';
import { basename, dirname } from '../path.js';
import { toReadableStream, concat } from '../reader.js';
import { stripEnd } from '../string.js';
import { FilenameTooLongError, CorruptedArchiveError } from './errors.js';

var _a, _b;
const _stream = Symbol.for("stream");
const _bodyUsed = Symbol.for("bodyUsed");
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
const USTarFileHeaderFieldLengths = new Map([
    // field => byte length ---------------- offset
    ["name", 100], // 0
    ["mode", 8], // 100
    ["uid", 8], // 108
    ["gid", 8], // 116
    ["size", 12], // 124
    ["mtime", 12], // 136
    ["checksum", 8], // 148
    ["typeflag", 1], // 156
    ["linkname", 100], // 157
    ["magic", 6], // 257
    ["version", 2], // 263
    ["uname", 32], // 265
    ["gname", 32], // 297
    ["devmajor", 8], // 329
    ["devminor", 8], // 337
    ["prefix", 155], // 345
    ["padding", 12], // 500
]);
// https://pubs.opengroup.org/onlinepubs/9699919799/utilities/pax.html#tag_20_92_13_06
// eight checksum bytes taken to be ascii spaces (decimal value 32)
const initialChecksum = 8 * 32;
function throwCorruptedArchiveError() {
    throw new CorruptedArchiveError("The archive is corrupted.");
}
function parseHeader(header) {
    const decoder = new TextDecoder();
    const info = {};
    let offset = 0;
    for (const [field, length] of USTarFileHeaderFieldLengths) {
        const buffer = header.subarray(offset, offset + length);
        const value = decoder.decode(buffer);
        info[field] = value;
        offset += length;
    }
    // validate checksum
    const checksum = getChecksum(header);
    if (checksum !== parseInt(info.checksum, 8)) {
        if (checksum === initialChecksum) {
            // EOF
            return null;
        }
        throwCorruptedArchiveError();
    }
    if (!info.magic.startsWith("ustar")) {
        throw new TypeError("Unsupported archive format: " + info.magic);
    }
    return [info, header.subarray(0, offset), header.subarray(offset)];
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
    var _c;
    const name = stripEnd(trimHeaderField(headerInfo.name), "/");
    const prefix = trimHeaderField(headerInfo.prefix);
    const relativePath = (prefix ? prefix + "/" : "") + name;
    return {
        name: basename(relativePath),
        kind: ((_c = FileTypes[parseInt(headerInfo.typeflag)]) !== null && _c !== void 0 ? _c : "file"),
        relativePath,
        size: parseInt(headerInfo.size, 8),
        mtime: new Date(parseInt(headerInfo.mtime, 8) * 1000),
        mode: parseInt(headerInfo.mode, 8),
        uid: parseInt(headerInfo.uid, 8),
        gid: parseInt(headerInfo.gid, 8),
        owner: trimHeaderField(headerInfo.uname),
        group: trimHeaderField(headerInfo.gname),
    };
}
function trimHeaderField(data) {
    const index = data.indexOf("\0");
    return (index === -1 ? data : data.slice(0, index)).trim();
}
function getEmptyData(info) {
    if (info.kind === "directory") {
        return new Uint8Array(0);
    }
    else {
        throw new TypeError("data must be provided for files.");
    }
}
const _entries = Symbol.for("entries");
/**
 * A `Tarball` instance represents a tar archive.
 *
 * NOTE: currently, this implementation only supports the UStar format.
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
        this[_b] = false;
        if (typeof ReadableStream === "undefined") {
            throw new NotSupportedError("ReadableStream is not supported in this environment.");
        }
    }
    constructEntry(relativePath, data, info) {
        var _c, _d, _e, _f, _g, _h, _j, _k;
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
            if (i < 0 || name.length > 100 || prefix.length > 155) {
                throw new FilenameTooLongError("UStar format does not allow a long file name (length of [file name"
                    + "prefix] + / + [file name] must be shorter than 256 bytes)");
            }
        }
        const encoder = new TextEncoder();
        let body;
        let size = 0;
        let mtime = info.mtime;
        if (typeof data === "string") {
            const _data = encoder.encode(data);
            body = toReadableStream([_data]);
            size = _data.byteLength;
        }
        else if (data instanceof ArrayBuffer) {
            body = toReadableStream([new Uint8Array(data)]);
            size = data.byteLength;
        }
        else if (data instanceof Uint8Array) {
            body = toReadableStream([data]);
            size = data.byteLength;
        }
        else if (ArrayBuffer.isView(data)) {
            const _data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            body = toReadableStream([_data]);
            size = _data.byteLength;
        }
        else if (typeof File === "function" && data instanceof File) {
            body = data.stream();
            size = data.size;
            mtime = (_c = info.mtime) !== null && _c !== void 0 ? _c : new Date(data.lastModified);
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
                throw new TypeError("size must be provided for ReadableStream data.");
            }
        }
        else {
            throw new TypeError("data must be a string, Uint8Array, ArrayBuffer, ArrayBufferView, Blob, or ReadableStream.");
        }
        mtime !== null && mtime !== void 0 ? mtime : (mtime = new Date());
        const kind = (_d = info.kind) !== null && _d !== void 0 ? _d : "file";
        const mode = (_e = info.mode) !== null && _e !== void 0 ? _e : (kind === "directory" ? 0o755 : 0o644);
        if (kind === "directory") {
            size = 0; // ensure size is 0 for directories
        }
        // https://man.freebsd.org/cgi/man.cgi?query=tar&sektion=5&apropos=0&manpath=FreeBSD+15.0-CURRENT
        const headerInfo = {
            name: name.padEnd(100, "\0"),
            mode: mode.toString(8).padStart(6, "0") + " \0",
            uid: ((_f = info.uid) !== null && _f !== void 0 ? _f : 0).toString(8).padStart(6, "0") + " \0",
            gid: ((_g = info.gid) !== null && _g !== void 0 ? _g : 0).toString(8).padStart(6, "0") + " \0",
            size: size.toString(8).padStart(size < 8 ** 11 ? 11 : 12, "0").padEnd(12, " "),
            mtime: Math.floor((mtime.getTime()) / 1000).toString(8).padStart(11, "0").padEnd(12, " "),
            checksum: " ".repeat(8),
            typeflag: kind in FileTypes ? String(FileTypes[kind]) : "0",
            linkname: "\0".repeat(100),
            magic: "ustar\0",
            version: "00",
            uname: ((_h = info.owner) !== null && _h !== void 0 ? _h : "").padEnd(32, "\0"),
            gname: ((_j = info.group) !== null && _j !== void 0 ? _j : "").padEnd(32, "\0"),
            devmajor: "\0".repeat(8),
            devminor: "\0".repeat(8),
            prefix: prefix.padEnd(155, "\0"),
            padding: "\0".repeat(12),
        };
        const header = new Uint8Array(HEADER_LENGTH);
        let offset = 0;
        for (const [field, length] of USTarFileHeaderFieldLengths) {
            const data = (_k = headerInfo[field]) !== null && _k !== void 0 ? _k : "";
            const bytes = encoder.encode(data);
            if (bytes.byteLength !== length) {
                throw new TypeError(`Invalid header field length for ${field}: ${bytes.byteLength}`);
            }
            header.set(bytes, offset);
            offset += length;
        }
        // update checksum
        const checksum = getChecksum(header);
        header.set(encoder.encode(checksum.toString(8).padStart(6, "0") + "\0 "), 148);
        const fileName = info.name
            || (typeof File === "function" && data instanceof File
                ? data.name
                : basename(relativePath));
        return {
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
        };
    }
    append(data, info = {}) {
        data !== null && data !== void 0 ? data : (data = getEmptyData(info));
        let relativePath = info.relativePath;
        if (!relativePath) {
            if (typeof File === "function" && data instanceof File) {
                relativePath = (data.webkitRelativePath || data.name);
            }
            else {
                throw new TypeError("info.relativePath must be provided.");
            }
        }
        const dir = dirname(relativePath).replace(/\\/g, "/");
        // If the input path has parent directories that are not in the archive,
        // we need to add them first.
        if (dir && dir !== "." && !this[_entries].some((entry) => entry.relativePath === dir)) {
            this.append(null, {
                kind: "directory",
                relativePath: dir,
            });
        }
        const entry = this.constructEntry(relativePath, data, info);
        this[_entries].push(entry);
    }
    /**
     * Retrieves an entry in the archive by its relative path.
     *
     * The returned entry object contains a `stream` property which is a copy of
     * the entry's data, and since it's a copy, the data in the archive is still
     * available even after the `stream` property is consumed.
     *
     * However, due to the nature of the `ReadableStream.tee()` API, if the copy
     * is consumed, the data will be loaded and cached in memory until the
     * tarball's stream is consumed or dropped. This may cause memory issues for
     * large files, so it is recommended not to use the `stream` property unless
     * necessary.
     */
    retrieve(relativePath) {
        const _entry = this[_entries].find((entry) => entry.relativePath === relativePath);
        if (!_entry) {
            return null;
        }
        const entry = omit(_entry, ["header", "body"]);
        Object.defineProperty(entry, "stream", {
            get() {
                if (entry[_stream]) {
                    return entry[_stream];
                }
                else {
                    const [copy1, copy2] = _entry.body.tee();
                    _entry.body = copy1;
                    return (entry[_stream] = copy2);
                }
            },
        });
        return entry;
    }
    /**
     * Removes an entry from the archive by its relative path.
     *
     * This function returns `true` if the entry is successfully removed, or `false` if the entry
     * does not exist.
     */
    remove(relativePath) {
        const index = this[_entries].findIndex((entry) => entry.relativePath === relativePath);
        if (index === -1) {
            return false;
        }
        else {
            this[_entries].splice(index, 1);
            return true;
        }
    }
    /**
     * Replaces an entry in the archive with new data.
     *
     * This function returns `true` if the entry is successfully replaced, or `false` if the entry
     * does not exist or the entry kind of the new data is incompatible with the old one.
     */
    replace(relativePath, data, info = {}) {
        const index = this[_entries].findIndex((entry) => entry.relativePath === relativePath);
        const oldEntry = index === -1 ? undefined : this[_entries][index];
        if (!oldEntry) {
            return false;
        }
        else if (oldEntry.kind === "directory" && info.kind !== "directory") {
            return false;
        }
        else if (oldEntry.kind !== "directory" && info.kind === "directory") {
            return false;
        }
        data !== null && data !== void 0 ? data : (data = getEmptyData(info));
        const newEntry = this.constructEntry(relativePath, data, info);
        this[_entries][index] = newEntry;
        return true;
    }
    [(_a = _entries, _b = _bodyUsed, Symbol.iterator)]() {
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
     * Returns the approximate size of the archive in bytes.
     *
     * NOTE: This value may not reflect the actual size of the archive file
     * when constructed via the {@link load} method.
     */
    get size() {
        return this[_entries].reduce((size, entry) => {
            size += entry.header.byteLength;
            size += entry.size;
            const paddingSize = HEADER_LENGTH - (entry.size % HEADER_LENGTH || HEADER_LENGTH);
            if (paddingSize > 0) {
                size += paddingSize;
            }
            return size;
        }, 0) + 1024; // EOF
    }
    /**
     * Indicates whether the body of the tarball has been used. This property
     * will be set to `true` after the `stream()` method is called.
     */
    get bodyUsed() {
        return this[_bodyUsed];
    }
    /**
     * Returns a readable stream of the archive that can be piped to a writable
     * target.
     *
     * This method can only be called once per instance, as after the stream
     * has been consumed, the underlying data of the archive's entries will no
     * longer be available, and subsequent calls to this method will throw an
     * error.
     *
     * To reuse the stream, use the `tee()` method of the stream to create a
     * copy of the stream instead.
     */
    stream(options = {}) {
        if (this[_bodyUsed]) {
            throw new TypeError("The body of the tarball has been used.");
        }
        this[_bodyUsed] = true;
        const streams = [];
        for (const { size, header, body } of this[_entries]) {
            streams.push(toReadableStream([header]));
            streams.push(body);
            const paddingSize = HEADER_LENGTH - (size % HEADER_LENGTH || HEADER_LENGTH);
            if (paddingSize > 0) {
                streams.push(toReadableStream([new Uint8Array(paddingSize)]));
            }
        }
        streams.push(toReadableStream([new Uint8Array(1024)])); // EOF
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
        let remains = new Uint8Array(0);
        let header = null;
        let headerInfo = null;
        let entry = null;
        let writer = null;
        let writtenBytes = 0;
        let paddingSize = 0;
        try {
            outer: while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                remains = remains.byteLength ? concat$1(remains, value) : value;
                while (true) {
                    if (paddingSize > 0 && remains.byteLength >= paddingSize) {
                        remains = remains.subarray(paddingSize);
                        paddingSize = 0;
                    }
                    if (!entry) {
                        if (remains.byteLength >= HEADER_LENGTH) {
                            const _header = parseHeader(remains);
                            if (_header) {
                                [headerInfo, header, remains] = _header;
                                entry = createEntry(headerInfo);
                            }
                            else {
                                remains = new Uint8Array(0);
                                break outer;
                            }
                        }
                        else {
                            break;
                        }
                    }
                    const fileSize = entry.size;
                    if (writer) {
                        let leftBytes = fileSize - writtenBytes;
                        if (remains.byteLength > leftBytes) {
                            const chunk = remains.subarray(0, leftBytes);
                            writer.push(chunk);
                            writtenBytes += chunk.byteLength;
                            remains = remains.subarray(leftBytes);
                        }
                        else {
                            writer.push(remains);
                            writtenBytes += remains.byteLength;
                            remains = new Uint8Array(0);
                        }
                    }
                    else {
                        writer = [];
                        continue;
                    }
                    if (writtenBytes === fileSize) {
                        const _entry = {
                            ...entry,
                            header: header,
                            body: toReadableStream(writer),
                        };
                        tarball[_entries].push(_entry);
                        paddingSize = HEADER_LENGTH - (fileSize % HEADER_LENGTH || HEADER_LENGTH);
                        writtenBytes = 0;
                        headerInfo = null;
                        header = null;
                        entry = null;
                        writer = null;
                    }
                    else {
                        break;
                    }
                }
            }
            if (remains.byteLength) {
                throwCorruptedArchiveError();
            }
            return tarball;
        }
        finally {
            reader.releaseLock();
        }
    }
}

export { HEADER_LENGTH, _entries, createEntry, Tarball as default, parseHeader, throwCorruptedArchiveError };
//# sourceMappingURL=Tarball.js.map
