/**
 * Utility functions for reading data from various types of source into various
 * forms.
 * @module
 */
import { concat, text } from "./bytes.ts";
import { asAsyncIterable, toAsyncIterable } from "./reader/util.ts";

export { toAsyncIterable };

/**
 * Wraps a source as a `ReadableStream` object that can be used to process streaming data.
 * This function is similar to {@link toAsyncIterable}, except it returns a `ReadableStream`
 * object.
 */
export function toReadableStream<T>(iterable: AsyncIterable<T> | Iterable<T>): ReadableStream<T>;
export function toReadableStream(es: EventSource, options?: { event?: string; }): ReadableStream<string>;
export function toReadableStream<T extends Uint8Array | string>(ws: WebSocket): ReadableStream<T>;
export function toReadableStream<T>(target: EventTarget, eventMap?: {
    message?: string;
    error?: string;
    close?: string;
}): ReadableStream<T>;
export function toReadableStream<T>(target: NodeJS.EventEmitter, eventMap?: {
    data?: string;
    error?: string;
    close?: string;
}): ReadableStream<T>;
export function toReadableStream<T>(source: any, eventMap: {
    event?: string; // for EventSource custom event
    message?: string;
    data?: string;
    error?: string;
    close?: string;
} | undefined = undefined): ReadableStream<T> {
    const iterable = toAsyncIterable(source, eventMap) as AsyncIterable<T>;

    return new ReadableStream<T>({
        async start(controller) {
            try {
                for await (const chunk of iterable) {
                    controller.enqueue(chunk);
                }
            } catch (error) {
                controller.error(error);
            } finally {
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
export async function readAsArray<T>(source: AsyncIterable<T> | ReadableStream<T>): Promise<T[]> {
    const iterable = asAsyncIterable(source)!;

    const list: T[] = [];

    for await (const chunk of iterable) {
        list.push(chunk);
    }

    return list;
}

/**
 * Reads all data from the given source to an `ArrayBuffer`.
 */
export async function readAsArrayBuffer(
    source: Blob | Uint8Array | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>
): Promise<ArrayBuffer> {
    if (typeof Blob === "function" && source instanceof Blob) {
        return await source.arrayBuffer();
    } else if (source instanceof Uint8Array) {
        return source.buffer as ArrayBuffer;
    }

    const iterable = asAsyncIterable(source) as AsyncIterable<Uint8Array> | null;

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
export async function readAsBlob(
    source: ArrayBuffer | Uint8Array | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>,
    type: string
): Promise<Blob> {
    if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        return new Blob([source], { type });
    }

    const buffer = await readAsArrayBuffer(source);
    return new Blob([buffer], { type });
}

/**
 * Reads all data from the given source to a data URL.
 */
export async function readAsDataURL(
    source: Blob | ArrayBuffer | Uint8Array | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>,
    type: string
): Promise<string> {
    if (source instanceof ArrayBuffer) {
        const base64 = text(new Uint8Array(source), "base64");
        return `data:${type};base64,${base64}`;
    } else if (source instanceof Uint8Array) {
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
export async function readAsObjectURL(
    source: Blob | ArrayBuffer | Uint8Array | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>,
    type: string
): Promise<string> {
    if (typeof Blob === "function" && source instanceof Blob) {
        return URL.createObjectURL(source);
    } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
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
export async function readAsText(
    source: Blob | ArrayBuffer | Uint8Array | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>,
    encoding: string | undefined = undefined
): Promise<string> {
    if (typeof Blob === "function" && source instanceof Blob && !encoding) {
        return await source.text();
    } else if (source instanceof ArrayBuffer || source instanceof Uint8Array) {
        return new TextDecoder(encoding).decode(source);
    }

    const buffer = await readAsArrayBuffer(source);
    return new TextDecoder(encoding).decode(buffer);
}

/**
 * Reads all data from the given source to a JSON object.
 */
export async function readAsJSON<T>(
    source: Blob | Uint8Array | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>,
): Promise<T> {
    const text = await readAsText(source);
    return JSON.parse(text);
}