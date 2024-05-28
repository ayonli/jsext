import bytes, { text } from '../bytes.js';
import { readAsArrayBuffer } from '../reader.js';

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

export { sha1, sha256, sha512, toBytes };
//# sourceMappingURL=web.js.map
