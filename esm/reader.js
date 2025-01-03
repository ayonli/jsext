import { concat as concat$1, text } from './bytes.js';
import { resolveReadableStream, toAsyncIterable, asAsyncIterable } from './reader/util.js';
export { resolveByteStream } from './reader/util.js';

/**
 * Utility functions for reading data from various types of source into various
 * forms.
 * @module
 */
function toReadableStream(source, eventMap = undefined) {
    if (source instanceof ReadableStream) {
        return source;
    }
    else if (typeof source["then"] === "function") {
        return resolveReadableStream(source);
    }
    const iterable = toAsyncIterable(source, eventMap);
    const iterator = iterable[Symbol.asyncIterator]();
    return new ReadableStream({
        async pull(controller) {
            const { done, value } = await iterator.next();
            if (done) {
                controller.close();
            }
            else {
                controller.enqueue(value);
            }
        },
        cancel(reason = undefined) {
            var _a;
            (_a = iterator.throw) === null || _a === void 0 ? void 0 : _a.call(iterator, reason);
        }
    });
}
/**
 * Reads all data from the iterable object or readable stream to an array.
 *
 * @example
 * ```ts
 * import { readAsArray } from "@ayonli/jsext/reader";
 * import * as fs from "node:fs";
 *
 * const file = fs.createReadStream("./package.json");
 * const chunks = await readAsArray(file);
 *
 * console.log(chunks);
 * ```
 */
async function readAsArray(source) {
    const iterable = asAsyncIterable(source);
    const list = [];
    for await (const chunk of iterable) {
        list.push(chunk);
    }
    return list;
}
/**
 * Reads all data from the given source to an `ArrayBuffer`.
 *
 * @example
 * ```ts
 * import { readAsArrayBuffer } from "@ayonli/jsext/reader";
 * import { createReadableStream } from "@ayonli/jsext/fs";
 *
 * const stream = createReadableStream("./package.json");
 * const buffer = await readAsArrayBuffer(stream);
 * ```
 */
async function readAsArrayBuffer(source) {
    if (typeof Blob === "function" && source instanceof Blob) {
        return await source.arrayBuffer();
    }
    else if (ArrayBuffer.isView(source)) {
        return source.buffer;
    }
    const iterable = asAsyncIterable(source);
    if (!iterable) {
        throw new TypeError("The source is not an async iterable object.");
    }
    const chunks = await readAsArray(iterable);
    const bytes = concat$1(...chunks);
    return bytes.buffer;
}
/**
 * Reads all data from the given source to a `Blob`.
 *
 * @example
 * ```ts
 * import { readAsBlob } from "@ayonli/jsext/reader";
 * import { createReadableStream } from "@ayonli/jsext/fs";
 *
 * const stream = createReadableStream("./package.json");
 * const blob = await readAsBlob(stream, "application/json");
 * ```
 */
async function readAsBlob(source, type) {
    if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        return new Blob([source], { type });
    }
    const buffer = await readAsArrayBuffer(source);
    return new Blob([buffer], { type });
}
/**
 * Reads all data from the given source to a data URL.
 *
 * @example
 * ```ts
 * import { readAsDataURL } from "@ayonli/jsext/reader";
 *
 * const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
 * const dataURL = await readAsDataURL(file, file.type);
 *
 * console.log(dataURL); // data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==
 * ```
 */
async function readAsDataURL(source, type) {
    if (source instanceof ArrayBuffer) {
        const base64 = text(new Uint8Array(source), "base64");
        return `data:${type};base64,${base64}`;
    }
    else if (source instanceof Uint8Array) {
        const base64 = text(source, "base64");
        return `data:${type};base64,${base64}`;
    }
    else if (ArrayBuffer.isView(source)) {
        const bytes = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
        const base64 = text(bytes, "base64");
        return `data:${type};base64,${base64}`;
    }
    const buffer = await readAsArrayBuffer(source);
    const _bytes = new Uint8Array(buffer);
    const base64 = text(_bytes, "base64");
    return `data:${type};base64,${base64}`;
}
/**
 * Reads all data from the given source to an object URL.
 *
 * @example
 * ```ts
 * import { readAsObjectURL } from "@ayonli/jsext/reader";
 *
 * const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
 * const objectURL = await readAsObjectURL(file, file.type);
 *
 * console.log(objectURL); // e.g. blob:http://localhost:8080/7b8e7b7d-7b7d-7b7d-7b7d-7b7d7b7d7b7d
 * ```
 */
async function readAsObjectURL(source, type) {
    if (source instanceof Blob) {
        return URL.createObjectURL(source);
    }
    else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        const blob = new Blob([source], { type });
        return URL.createObjectURL(blob);
    }
    const buffer = await readAsArrayBuffer(source);
    const blob = new Blob([buffer], { type });
    return URL.createObjectURL(blob);
}
/**
 * Reads all data from the given source to a string.
 *
 * @example
 * ```ts
 * import { readAsText } from "@ayonli/jsext/reader";
 * import { createReadableStream } from "@ayonli/jsext/fs";
 *
 * const stream = createReadableStream("./package.json");
 * const text = await readAsText(stream);
 * ```
 */
async function readAsText(source, encoding = undefined) {
    if (typeof Blob === "function" && source instanceof Blob && !encoding) {
        return await source.text();
    }
    else if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        return new TextDecoder(encoding).decode(source);
    }
    const buffer = await readAsArrayBuffer(source);
    return new TextDecoder(encoding).decode(buffer);
}
/**
 * Reads all data from the given source to a JSON object.
 *
 * @example
 * ```ts
 * import { readAsJSON } from "@ayonli/jsext/reader";
 * import { createReadableStream } from "@ayonli/jsext/fs";
 *
 * const stream = createReadableStream("./package.json");
 * const pkg = await readAsJSON(stream);
 * ```
 */
async function readAsJSON(source) {
    const text = await readAsText(source);
    return JSON.parse(text);
}
function concat(...sources) {
    if (!sources[0]) {
        throw new TypeError("No sources provided.");
    }
    if (typeof ReadableStream === "function" && sources[0] instanceof ReadableStream) {
        if (!sources.every(source => source instanceof ReadableStream)) {
            throw new TypeError("All sources must be readable streams.");
        }
        const streams = sources;
        let current = 0;
        let reader = streams[current].getReader();
        return new ReadableStream({
            async pull(controller) {
                try {
                    let { done, value } = await reader.read();
                    if (!done) {
                        controller.enqueue(value);
                    }
                    else {
                        reader.releaseLock();
                        current++;
                        if (current < streams.length) {
                            reader = streams[current].getReader();
                            return this.pull(controller);
                        }
                        else {
                            controller.close();
                        }
                    }
                }
                catch (err) {
                    reader.releaseLock();
                    controller.error(err);
                }
            }
        });
    }
    else {
        if (sources.some(source => typeof source[Symbol.asyncIterator] !== "function")) {
            throw new TypeError("All sources must be async iterable objects.");
        }
        const iterables = sources;
        return {
            [Symbol.asyncIterator]: async function* () {
                for (const source of iterables) {
                    yield* source;
                }
            }
        };
    }
}

export { concat, readAsArray, readAsArrayBuffer, readAsBlob, readAsDataURL, readAsJSON, readAsObjectURL, readAsText, toAsyncIterable, toReadableStream };
//# sourceMappingURL=reader.js.map
