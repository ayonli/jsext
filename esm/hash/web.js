import bytes, { text } from '../bytes.js';
import { readAsArrayBuffer } from '../reader.js';

/**
 * Calculates the hash of the given data, the result is a 32-bit unsigned integer.
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
function hash(data) {
    let str;
    if (typeof data === "string") {
        str = data;
    }
    else if (data instanceof ArrayBuffer) {
        str = text(new Uint8Array(data));
    }
    else if (data instanceof Uint8Array) {
        str = text(data);
    }
    else if (ArrayBuffer.isView(data)) {
        const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        str = text(bytes);
    }
    else {
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
/**
 * Calculates the Adler-32 checksum of the given data, the result is a 32-bit
 * unsigned integer.
 *
 * Adler-32 checksum is used in zlib and libpng, it is similar to CRC32 but
 * faster and less reliable.
 *
 * @param previous The previous Adler-32 value, default is `1`. This is useful
 * when calculating the checksum of a large data in chunks.
 *
 * @example
 * ```ts
 * import { adler32 } from "@ayonli/jsext/hash";
 *
 * console.log(adler32("Hello, World!")); // 530449514
 * console.log(adler32(new Uint8Array([1, 2, 3]))); // 851975
 *
 * // calculate chunks
 * const chunks = ["Hello, ", "World!"];
 * let checksum = 1;
 *
 * for (const chunk of chunks) {
 *     checksum = adler32(chunk, checksum);
 * }
 *
 * console.log(checksum); // 530449514
 * ```
 */
function adler32(data, previous = 1) {
    const bin = toBytes(data);
    let a = previous & 0xffff;
    let b = (previous >>> 16) & 0xffff;
    for (let i = 0; i < bin.length; i++) {
        a = (a + bin[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
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
 * Calculates the CRC-32 checksum of the given data, the result is a 32-bit
 * unsigned integer.
 *
 * This function is based on IEEE polynomial, which is widely used by Ethernet
 * (IEEE 802.3), v.42, fddi, gzip, zip, png and other technologies.
 *
 * @param previous The previous checksum value, default is `0`. This is useful
 * when calculating the CRC of a large data in chunks.
 *
 * @example
 * ```ts
 * import { crc32 } from "@ayonli/jsext/hash";
 *
 * console.log(crc32("Hello, World!")); // 3964322768
 * console.log(crc32(new Uint8Array([1, 2, 3]))); // 1438416925
 *
 * // calculate chunks
 * const chunks = ["Hello, ", "World!"];
 * let checksum = 0;
 *
 * for (const chunk of chunks) {
 *     checksum = crc32(chunk, checksum);
 * }
 *
 * console.log(checksum); // 3964322768
 * ```
 */
function crc32(data, previous = 0) {
    const bin = toBytes(data);
    let crc = ~~previous ^ -1;
    for (let i = 0; i < bin.length; i++) {
        crc = CRC32_TABLE[(crc ^ bin[i]) & 0xff] ^ crc >>> 8;
    }
    return (crc ^ -1) >>> 0;
}
function toBytes(data) {
    if (typeof data === "string") {
        return bytes(data);
    }
    else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    else if (data instanceof Uint8Array) {
        return data;
    }
    else if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    else {
        throw new TypeError("Unsupported data type");
    }
}
async function toBytesAsync(data) {
    if (typeof data === "string" || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        return toBytes(data);
    }
    else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
        return new Uint8Array(await readAsArrayBuffer(data));
    }
    else if (typeof Blob === "function" && data instanceof Blob) {
        return new Uint8Array(await data.arrayBuffer());
    }
    else {
        throw new TypeError("Unsupported data type");
    }
}
async function sha1(data, encoding = undefined) {
    const bytes = await toBytesAsync(data);
    const hash = await crypto.subtle.digest("SHA-1", bytes);
    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    }
    else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    }
    else {
        return hash;
    }
}
async function sha256(data, encoding = undefined) {
    const bytes = await toBytesAsync(data);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    }
    else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    }
    else {
        return hash;
    }
}
async function sha512(data, encoding = undefined) {
    const bytes = await toBytesAsync(data);
    const hash = await crypto.subtle.digest("SHA-512", bytes);
    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    }
    else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    }
    else {
        return hash;
    }
}
async function hmac(algorithm, key, data, encoding = undefined) {
    const keyBuffer = await crypto.subtle.importKey("raw", bytes(key), {
        name: "HMAC",
        hash: {
            "sha1": "SHA-1",
            "sha256": "SHA-256",
            "sha512": "SHA-512",
        }[algorithm],
    }, false, ["sign"]);
    const dataBytes = await toBytesAsync(data);
    const hash = await crypto.subtle.sign("HMAC", keyBuffer, dataBytes);
    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    }
    else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    }
    else {
        return hash;
    }
}

export { adler32, crc32, hash, hmac, sha1, sha256, sha512, toBytesAsync };
//# sourceMappingURL=web.js.map
