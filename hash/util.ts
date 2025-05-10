import bytes from "@jsext/bytes";
import { readAsArrayBuffer } from "@jsext/reader";
import type { DataSource } from "./web.ts";

export function toBytes(data: string | BufferSource): Uint8Array {
    if (typeof data === "string") {
        return bytes(data);
    } else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
        return data;
    } else if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else {
        throw new TypeError("Unsupported data type");
    }
}

export async function toBytesAsync(data: DataSource): Promise<Uint8Array> {
    if (typeof data === "string" || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        return toBytes(data);
    } else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
        return new Uint8Array(await readAsArrayBuffer(data));
    } else if (typeof Blob === "function" && data instanceof Blob) {
        return new Uint8Array(await data.arrayBuffer());
    } else {
        throw new TypeError("Unsupported data type");
    }
}
