import bytes, { text } from '../bytes.js';
import { readAsArrayBuffer } from '../reader.js';

async function toArrayBuffer(data) {
    let buffer;
    if (typeof data === "string") {
        buffer = bytes(data).buffer;
    }
    else if (data instanceof ArrayBuffer) {
        buffer = data;
    }
    else if (ArrayBuffer.isView(data)) {
        buffer = data.buffer;
    }
    else if (typeof ReadableStream === "function" && data instanceof ReadableStream) {
        buffer = await readAsArrayBuffer(data);
    }
    else if (typeof Blob === "function" && data instanceof Blob) {
        buffer = await data.arrayBuffer();
    }
    else {
        throw new TypeError("Unsupported data type");
    }
    return buffer;
}
async function sha1(data, encoding = undefined) {
    const buffer = await toArrayBuffer(data);
    const hash = await crypto.subtle.digest("SHA-1", buffer);
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
    const buffer = await toArrayBuffer(data);
    const hash = await crypto.subtle.digest("SHA-256", buffer);
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
    const buffer = await toArrayBuffer(data);
    const hash = await crypto.subtle.digest("SHA-512", buffer);
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

export { sha1, sha256, sha512, toArrayBuffer };
//# sourceMappingURL=web.js.map
