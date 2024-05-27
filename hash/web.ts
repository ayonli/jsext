import bytes, { text } from "../bytes.ts";
import { readAsArrayBuffer } from "../reader.ts";

export async function toArrayBuffer(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob
): Promise<ArrayBuffer> {
    let buffer: ArrayBuffer;

    if (typeof data === "string") {
        buffer = bytes(data).buffer;
    } else if (data instanceof ArrayBuffer) {
        buffer = data;
    } else if (ArrayBuffer.isView(data)) {
        buffer = data.buffer;
    } else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
        buffer = await readAsArrayBuffer(data);
    } else if (typeof Blob === "function" && data instanceof Blob) {
        buffer = await data.arrayBuffer();
    } else {
        throw new TypeError("Unsupported data type");
    }

    return buffer;
}

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
    const buffer = await toArrayBuffer(data);
    const hash = await crypto.subtle.digest("SHA-1", buffer);

    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    } else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    } else {
        return hash;
    }
}

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
    const buffer = await toArrayBuffer(data);
    const hash = await crypto.subtle.digest("SHA-256", buffer);

    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    } else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    } else {
        return hash;
    }
}

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
    const buffer = await toArrayBuffer(data);
    const hash = await crypto.subtle.digest("SHA-512", buffer);

    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    } else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    } else {
        return hash;
    }
}
