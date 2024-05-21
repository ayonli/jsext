import { concat } from '../bytes.js';
import { isDeno, isNodeLike } from '../env.js';
import { createReadableStream, ensureDir, createWritableStream, chmod, chown, utimes } from '../fs.js';
import { resolve, join, dirname } from '../path.js';
import Tarball, { HEADER_LENGTH, parseHeader, createEntry } from './Tarball.js';

async function untar(src, dest = {}, options = {}) {
    src = typeof src === "string" ? resolve(src) : src;
    let _dest = undefined;
    if (typeof dest === "string") {
        _dest = resolve(dest);
    }
    else if (typeof dest === "object") {
        if (typeof FileSystemDirectoryHandle === "function" &&
            dest instanceof FileSystemDirectoryHandle) {
            _dest = dest;
        }
        else {
            options = dest;
        }
    }
    let input = src instanceof ReadableStream ? src : createReadableStream(src, options);
    if (options.gzip) {
        const gzip = new DecompressionStream("gzip");
        input = input.pipeThrough(gzip);
    }
    const { signal } = options;
    signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", () => {
        input.cancel(signal.reason);
    });
    if (!_dest) {
        return await Tarball.load(input);
    }
    const reader = input.getReader();
    let lastChunk = new Uint8Array(0);
    let rawHeader = null;
    let entry = null;
    let filename = undefined;
    let writer;
    let writtenBytes = 0;
    let paddingSize = 0;
    try {
        outer: while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            lastChunk = lastChunk.byteLength ? concat(lastChunk, value) : value;
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
                entry !== null && entry !== void 0 ? entry : (entry = createEntry(rawHeader));
                const fileSize = entry.size;
                if (writer) {
                    const chunk = lastChunk.subarray(0, fileSize - writtenBytes);
                    await writer.write(chunk);
                    lastChunk = lastChunk.subarray(fileSize - writtenBytes);
                    writtenBytes += chunk.byteLength;
                }
                else if (entry.kind === "directory") {
                    if (typeof FileSystemDirectoryHandle === "function" &&
                        _dest instanceof FileSystemDirectoryHandle) {
                        await ensureDir(entry.relativePath, {
                            ...options,
                            root: _dest,
                            mode: entry.mode,
                        });
                    }
                    else {
                        filename = join(_dest, entry.relativePath);
                        await ensureDir(filename, {
                            ...options,
                            mode: entry.mode,
                        });
                    }
                }
                else {
                    let _options = options;
                    if (typeof FileSystemDirectoryHandle === "function" &&
                        _dest instanceof FileSystemDirectoryHandle) {
                        _options = { ...options, root: _dest };
                        filename = entry.relativePath;
                    }
                    else {
                        filename = join(_dest, entry.relativePath);
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
                    writer === null || writer === void 0 ? void 0 : writer.close();
                    writer = undefined;
                    filename = undefined;
                    entry = null;
                }
                else {
                    break;
                }
            }
        }
        if (lastChunk.byteLength) {
            throw new Error("The archive is corrupted");
        }
    }
    finally {
        reader.releaseLock();
    }
}

export { untar as default };
//# sourceMappingURL=untar.js.map
