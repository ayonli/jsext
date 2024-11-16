import bytes, { text } from '../bytes.js';
import { readAsArrayBuffer } from '../reader.js';

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
 * Calculates the CRC-32 hash of the given data.
 *
 * This function is based on IEEE polynomial, which is widely used by Ethernet
 * (IEEE 802.3), v.42, fddi, gzip, zip, png and other technologies.
 *
 * @example
 * ```ts
 * import { crc32 } from "@ayonli/jsext/hash";
 *
 * console.log(crc32("Hello, World!")); // 3964322768
 * console.log(crc32(new Uint8Array([1, 2, 3]))); // 1438416925
 * ```
 */
function crc32(data) {
    let crc = 0 ^ (-1);
    let bin;
    if (data instanceof Uint8Array) {
        bin = data;
    }
    else if (typeof data === "string") {
        bin = bytes(data);
    }
    else if (data instanceof ArrayBuffer) {
        bin = new Uint8Array(data);
    }
    else if (ArrayBuffer.isView(data)) {
        bin = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    else {
        throw new TypeError("Unsupported data type");
    }
    for (let i = 0; i < bin.length; i++) {
        crc = CRC32_TABLE[(crc ^ bin[i]) & 0xff] ^ crc >>> 8;
    }
    return (crc ^ (-1)) >>> 0;
}
async function toBytes(data) {
    let bin;
    if (typeof data === "string") {
        bin = bytes(data);
    }
    else if (data instanceof ArrayBuffer) {
        bin = new Uint8Array(data);
    }
    else if (data instanceof Uint8Array) {
        bin = data;
    }
    else if (ArrayBuffer.isView(data)) {
        bin = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
    else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
        bin = new Uint8Array(await readAsArrayBuffer(data));
    }
    else if (typeof Blob === "function" && data instanceof Blob) {
        bin = new Uint8Array(await data.arrayBuffer());
    }
    else {
        throw new TypeError("Unsupported data type");
    }
    return bin;
}
async function sha1(data, encoding = undefined) {
    const bytes = await toBytes(data);
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
    const bytes = await toBytes(data);
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
    const bytes = await toBytes(data);
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
    const dataBytes = await toBytes(data);
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

export { crc32, hash, hmac, sha1, sha256, sha512, toBytes };
//# sourceMappingURL=web.js.map
