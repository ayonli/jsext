import bytes, { text } from "../bytes.ts";
import { readAsArrayBuffer } from "../reader.ts";

export type DataSource = string | BufferSource | ReadableStream<Uint8Array> | Blob;

/**
 * Calculates the hash of the given data.
 * 
 * This function uses the same algorithm as the [string-hash](https://www.npmjs.com/package/string-hash)
 * package, non-string data are converted to strings before hashing.
 * 
 * @example
 * ```ts
 * import hash from "@ayonli/jsext/hash";
 * 
 * console.log(hash("Hello, World!")); // 4010631688
 * console.log(hash(new Uint8Array([1, 2, 3]))); // 193378021
 * ```
 */
export function hash(data: string | BufferSource): number {
    let str: string;

    if (typeof data === "string") {
        str = data;
    } else if (data instanceof ArrayBuffer) {
        str = text(new Uint8Array(data));
    } else if (data instanceof Uint8Array) {
        str = text(data);
    } else if (ArrayBuffer.isView(data)) {
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        str = text(bytes);
    } else {
        throw new TypeError("Unsupported data type");
    }

    let hash = 5381;
    let i = str.length;

    while (i) {
        hash = (hash * 33) ^ str.charCodeAt(--i);
    }

    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
     * integers. Since we want the results to be always positive, convert the
     * signed int to an unsigned by doing an unsigned bitshift. */
    return hash >>> 0;
}

const CRC32_TABLE = (() => {
    const IEEE = 0xedb88320;

    const table = new Uint32Array(256);

    // Fill the table
    for (let i = 0; i < 256; i++) {
        let crc = i;

        for (let j = 0; j < 8; j++) {
            crc = crc & 1 ? IEEE ^ crc >>> 1 : crc >>> 1;
        }

        table[i] = crc;
    }

    return table;
})();

/**
 * Calculates the CRC-32 hash of the given data, the result is a 32-bit unsigned
 * integer.
 * 
 * This function is based on IEEE polynomial, which is widely used by Ethernet
 * (IEEE 802.3), v.42, fddi, gzip, zip, png and other technologies.
 * 
 * @param previous The previous CRC value, default is `0`. This is useful when
 * calculating the CRC of a large data in chunks.
 * 
 * @example
 * ```ts
 * import { crc32 } from "@ayonli/jsext/hash";
 * 
 * console.log(crc32("Hello, World!")); // 3964322768
 * console.log(crc32(new Uint8Array([1, 2, 3]))); // 1438416925
 * ```
 */
export function crc32(data: string | BufferSource, previous = 0): number {
    let bin: Uint8Array;

    if (data instanceof Uint8Array) {
        bin = data;
    } else if (typeof data === "string") {
        bin = bytes(data);
    } else if (data instanceof ArrayBuffer) {
        bin = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
        bin = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else {
        throw new TypeError("Unsupported data type");
    }

    let crc = ~~previous ^ -1;

    for (let i = 0; i < bin.length; i++) {
        crc = CRC32_TABLE[(crc ^ bin[i]!) & 0xff]! ^ crc >>> 8;
    }

    return (crc ^ -1) >>> 0;
}

export async function toBytes(data: DataSource): Promise<Uint8Array> {
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

export function sha1(data: DataSource): Promise<ArrayBuffer>;
export function sha1(data: DataSource, encoding: "hex" | "base64"): Promise<string>;
export async function sha1(
    data: DataSource,
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

export async function sha256(data: DataSource): Promise<ArrayBuffer>;
export async function sha256(data: DataSource, encoding: "hex" | "base64"): Promise<string>;
export async function sha256(
    data: DataSource,
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

export async function sha512(data: DataSource): Promise<ArrayBuffer>;
export async function sha512(data: DataSource, encoding: "hex" | "base64"): Promise<string>;
export async function sha512(
    data: DataSource,
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

export async function hmac(
    algorithm: "sha1" | "sha256" | "sha512",
    key: string | BufferSource,
    data: DataSource
): Promise<ArrayBuffer>;
export async function hmac(
    algorithm: "sha1" | "sha256" | "sha512",
    key: string | BufferSource,
    data: DataSource,
    encoding: "hex" | "base64"
): Promise<string>;
export async function hmac(
    algorithm: "sha1" | "sha256" | "sha512",
    key: string | BufferSource,
    data: DataSource,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<string | ArrayBuffer> {
    const keyBuffer = await crypto.subtle.importKey("raw", bytes(key), {
        name: "HMAC",
        hash: {
            "sha1": "SHA-1",
            "sha256": "SHA-256",
            "sha512": "SHA-512",
        }[algorithm],
    }, false, ["sign"]);
    const dataBytes = await toBytes(data);
    const hash = await crypto.subtle.sign("HMAC", keyBuffer, dataBytes);

    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    } else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    } else {
        return hash;
    }
}
