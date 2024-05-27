import { text } from '../bytes.js';
import { toArrayBuffer } from '../hash/web.js';
export { sha1, sha256, sha512 } from '../hash/web.js';

async function md5(data, encoding = undefined) {
    let buffer = await toArrayBuffer(data);
    const hash = await crypto.subtle.digest("MD5", buffer);
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

export { md5 };
//# sourceMappingURL=hash.js.map
