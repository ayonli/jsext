import { concat, text } from './bytes.js';
import { resolveReadableStream, toAsyncIterable, asAsyncIterable } from './reader/util.js';

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
    return new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of iterable) {
                    controller.enqueue(chunk);
                }
            }
            catch (error) {
                controller.error(error);
            }
            finally {
                controller.close();
            }
        }
    });
}
/**
 * Reads all data from the iterable object or readable stream to an array.
 *
 * @example
 * ```ts
 * import { readAsArray } from "@ayonli/jsext/read";
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
 */
async function readAsArrayBuffer(source) {
    if (typeof Blob === "function" && source instanceof Blob) {
        return await source.arrayBuffer();
    }
    else if (typeof Buffer === "function" && source instanceof Buffer) {
        return source.buffer.slice(0, source.length);
    }
    else if (source instanceof Uint8Array) {
        return source.buffer;
    }
    const iterable = asAsyncIterable(source);
    if (!iterable) {
        throw new TypeError("The source is not an async iterable object.");
    }
    const chunks = await readAsArray(iterable);
    const bytes = concat(...chunks.map(chunk => new Uint8Array(chunk)));
    return bytes.buffer;
}
/**
 * Reads all data from the given source to a `Blob`.
 */
async function readAsBlob(source, type) {
    if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        return new Blob([source], { type });
    }
    const buffer = await readAsArrayBuffer(source);
    return new Blob([buffer], { type });
}
/**
 * Reads all data from the given source to a data URL.
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
    const buffer = await readAsArrayBuffer(source);
    const _bytes = new Uint8Array(buffer);
    const base64 = text(_bytes, "base64");
    return `data:${type};base64,${base64}`;
}
/**
 * Reads all data from the given source to an object URL.
 */
async function readAsObjectURL(source, type) {
    if (typeof Blob === "function" && source instanceof Blob) {
        return URL.createObjectURL(source);
    }
    else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        const blob = new Blob([source], { type });
        return URL.createObjectURL(blob);
    }
    const buffer = await readAsArrayBuffer(source);
    const blob = new Blob([buffer], { type });
    return URL.createObjectURL(blob);
}
/**
 * Reads all data from the given source to a string.
 */
async function readAsText(source, encoding = undefined) {
    if (typeof Blob === "function" && source instanceof Blob && !encoding) {
        return await source.text();
    }
    else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        return new TextDecoder(encoding).decode(source);
    }
    const buffer = await readAsArrayBuffer(source);
    return new TextDecoder(encoding).decode(buffer);
}
/**
 * Reads all data from the given source to a JSON object.
 */
async function readAsJSON(source) {
    const text = await readAsText(source);
    return JSON.parse(text);
}

export { readAsArray, readAsArrayBuffer, readAsBlob, readAsDataURL, readAsJSON, readAsObjectURL, readAsText, toAsyncIterable, toReadableStream };
//# sourceMappingURL=reader.js.map
