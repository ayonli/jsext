import { text } from '../bytes.js';
import { toBytesAsync } from '../hash/util.js';
import hash from '../hash/web.js';
export { adler32, crc32, hmac, sha1, sha256, sha512 } from '../hash/web.js';

async function md5(data, encoding = undefined) {
    let bytes = await toBytesAsync(data);
    const hash = await crypto.subtle.digest("MD5", bytes);
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

export { hash as default, md5 };
//# sourceMappingURL=hash.js.map
