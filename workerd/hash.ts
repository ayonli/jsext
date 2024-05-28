import { text } from "../bytes.ts";
import { hash, toBytes, sha1, sha256, sha512 } from "../hash/web.ts";

export default hash;
export { sha1, sha256, sha512 };

export function md5(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob
): Promise<ArrayBuffer>;
export function md5(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64"
): Promise<string>;
export async function md5(
    data: string | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array> | Blob,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<string | ArrayBuffer> {
    let bytes = await toBytes(data);
    const hash = await crypto.subtle.digest("MD5", bytes);

    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    } else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    } else {
        return hash;
    }
}
