export { etag, ifMatch, ifNoneMatch, parseAccepts, parseContentType, parseCookie, parseRange, stringifyCookie } from '../http/util.js';

function withWeb(listener) {
    throw new Error("Unsupported runtime");
}
async function serveStatic(req, options = {}) {
    throw new Error("Unsupported runtime");
}

export { serveStatic, withWeb };
//# sourceMappingURL=http.js.map
