import { text } from "../bytes.ts";
import hash, {
    type DataSource,
    adler32,
    crc32,
    hmac,
    toBytesAsync,
    sha1,
    sha256,
    sha512,
} from "../hash/web.ts";

export type { DataSource };

export default hash;
export { adler32, crc32, hmac, sha1, sha256, sha512 };

export function md5(data: DataSource): Promise<ArrayBuffer>;
export function md5(data: DataSource, encoding: "hex" | "base64"): Promise<string>;
export async function md5(
    data: DataSource,
    encoding: "hex" | "base64" | undefined = undefined
): Promise<string | ArrayBuffer> {
    let bytes = await toBytesAsync(data);
    const hash = await crypto.subtle.digest("MD5", bytes);

    if (encoding === "hex") {
        return text(new Uint8Array(hash), "hex");
    } else if (encoding === "base64") {
        return text(new Uint8Array(hash), "base64");
    } else {
        return hash;
    }
}
