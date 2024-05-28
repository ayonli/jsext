import bytes, { text } from "../bytes.ts";
import { readAsArrayBuffer } from "../reader.ts";

export async function toBytes(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob
): Promise<Uint8Array> {
    let bin: Uint8Array;

    if (typeof data === "string") {
        bin = bytes(data);
    } else if (data instanceof ArrayBuffer) {
        bin = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
        bin = data;
    } else if (ArrayBuffer.isView(data)) {
        bin = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
        bin = new Uint8Array(await readAsArrayBuffer(data));
    } else if (typeof Blob === "function" && data instanceof Blob) {
        bin = new Uint8Array(await data.arrayBuffer());
    } else {
        throw new TypeError("Unsupported data type");
    }

    return bin;
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
    const bytes = await toBytes(data);
    const hash = await crypto.subtle.digest("SHA-1", bytes);

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
    const bytes = await toBytes(data);
    const hash = await crypto.subtle.digest("SHA-256", bytes);

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
    const bytes = await toBytes(data);
    const hash = await crypto.subtle.digest("SHA-512", bytes);

    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    } else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    } else {
        return hash;
    }
}
