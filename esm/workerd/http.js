import bytes from '../bytes.js';
import { sha256 } from '../hash/web.js';
export { ifMatch, ifNoneMatch, parseAccepts, parseContentType, parseCookie, parseRange, stringifyCookie } from '../http/util.js';

async function etag(data) {
    var _a;
    if (typeof data === "string" || data instanceof Uint8Array) {
        if (!data.length) {
            // a short circuit for zero length entities
            return `0-47DEQpj8HBSa+/TImW+5JCeuQeR`;
        }
        if (typeof data === "string") {
            data = bytes(data);
        }
        const hash = await sha256(data, "base64");
        return `${data.length.toString(16)}-${hash.slice(0, 27)}`;
    }
    const mtime = (_a = data.mtime) !== null && _a !== void 0 ? _a : new Date();
    const hash = await sha256(mtime.toISOString(), "base64");
    return `${data.size.toString(16)}-${hash.slice(0, 27)}`;
}
async function randomPort(prefer = undefined) {
    throw new Error("Unsupported runtime");
}
function withWeb(listener) {
    throw new Error("Unsupported runtime");
}
async function serveStatic(req, options = {}) {
    throw new Error("Unsupported runtime");
}

export { etag, randomPort, serveStatic, withWeb };
//# sourceMappingURL=http.js.map
