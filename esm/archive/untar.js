import { concat } from '../bytes.js';
import { createReadableStream, ensureDir, writeFile } from '../fs.js';
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
    const { signal } = options;
    const input = src instanceof ReadableStream ? src : createReadableStream(src, options);
    signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", () => {
        input.cancel(signal.reason);
    });
    if (!_dest) {
        return await Tarball.load(input, options);
    }
    const reader = input.getReader();
    let lastChunk = new Uint8Array(0);
    let headerInfo = null;
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            reader.releaseLock();
            break;
        }
        lastChunk = lastChunk.byteLength ? concat(lastChunk, value) : value;
        while (true) {
            if (!headerInfo) {
                if (lastChunk.byteLength >= HEADER_LENGTH) {
                    [headerInfo, lastChunk] = parseHeader(lastChunk);
                }
                else {
                    break;
                }
            }
            const fileSize = parseInt(headerInfo.size, 8);
            if (lastChunk.byteLength >= fileSize) {
                const data = lastChunk.slice(0, fileSize); // use slice to make a copy
                const info = createEntry(headerInfo);
                if (info.kind === "directory") {
                    if (_dest instanceof FileSystemDirectoryHandle) {
                        await ensureDir(info.relativePath, { ...options, root: _dest });
                    }
                    else {
                        await ensureDir(join(_dest, info.relativePath), options);
                    }
                }
                else {
                    if (_dest instanceof FileSystemDirectoryHandle) {
                        const _options = { ...options, root: _dest };
                        await ensureDir(dirname(info.relativePath), _options);
                        await writeFile(info.relativePath, data, _options);
                    }
                    else {
                        const filename = join(_dest, info.relativePath);
                        await ensureDir(dirname(filename), options);
                        await writeFile(filename, data, options);
                    }
                }
                const paddingSize = HEADER_LENGTH - (fileSize % HEADER_LENGTH || HEADER_LENGTH);
                if (paddingSize > 0) {
                    lastChunk = lastChunk.subarray(fileSize + paddingSize);
                }
                else {
                    lastChunk = lastChunk.subarray(fileSize);
                }
                headerInfo = null;
            }
            else {
                break;
            }
        }
    }
}

export { untar as default };
//# sourceMappingURL=untar.js.map
