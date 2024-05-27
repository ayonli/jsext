/**
 * Simplified hash functions for various data types.
 * @module
 */

import { isDeno, isNodeLike } from "./env.ts";
import { toArrayBuffer, sha1 as _sha1, sha256 as _sha256, sha512 as _sha512 } from "./hash/web.ts";

async function nodeHash(
    algorithm: "sha1" | "sha256" | "sha512" | "md5",
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<ArrayBuffer | string> {
    const crypto = await import("node:crypto");
    const buffer = await toArrayBuffer(data);
    const hash = crypto.createHash(algorithm);

    hash.update(new Uint8Array(buffer));

    if (encoding) {
        return hash.digest(encoding);
    } else {
        const result = hash.digest();
        return result.buffer.slice(0, result.byteLength);
    }
}

/**
 * Calculates the SHA-1 hash of the given data.
 */
export function sha1(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob
): Promise<ArrayBuffer>;
export function sha1(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64"
): Promise<string>;
export async function sha1(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<string | ArrayBuffer> {
    if (typeof crypto === "object") {
        return encoding ? _sha1(data, encoding) : _sha1(data);
    } else if (isDeno || isNodeLike) {
        return nodeHash("sha1", data, encoding);
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Calculates the SHA-256 hash of the given data.
 */
export async function sha256(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob
): Promise<ArrayBuffer>;
export async function sha256(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64"
): Promise<string>;
export async function sha256(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<string | ArrayBuffer> {
    if (typeof crypto === "object") {
        return encoding ? _sha256(data, encoding) : _sha256(data);
    } else if (isDeno || isNodeLike) {
        return nodeHash("sha256", data, encoding);
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Calculates the SHA-512 hash of the given data.
 */
export async function sha512(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob
): Promise<ArrayBuffer>;
export async function sha512(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64"
): Promise<string>;
export async function sha512(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<string | ArrayBuffer> {
    if (typeof crypto === "object") {
        return encoding ? _sha512(data, encoding) : _sha512(data);
    } else if (isDeno || isNodeLike) {
        return nodeHash("sha512", data, encoding);
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Calculates the MD5 hash of the given data.
 * 
 * NOTE: This function is not available in the browser.
 */
export async function md5(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob
): Promise<ArrayBuffer>;
export async function md5(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64"
): Promise<string>;
export async function md5(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<string | ArrayBuffer> {
    if (isDeno || isNodeLike) {
        return nodeHash("md5", data, encoding);
    } else {
        throw new Error("Unsupported runtime");
    }
}
