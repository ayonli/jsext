import bytes from '../bytes.js';
import { getMIME } from '../filetype.js';
import { sha256 } from '../hash/web.js';
import { respondDir } from '../http/internal.js';
import { Server } from '../http/server.js';
import { parseRange, ifNoneMatch, ifMatch } from '../http/util.js';
export { parseAccepts, parseBasicAuth, parseContentType, parseCookie, parseCookies, stringifyCookie, stringifyCookies, verifyBasicAuth } from '../http/util.js';
import { join, extname } from '../path.js';
import { stripStart } from '../string.js';
import { WebSocketServer } from './ws.js';
import { startsWith } from '../path/util.js';

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
function serve(options) {
    // @ts-ignore
    return new Server(async () => {
        const ws = new WebSocketServer(options.ws);
        return {
            http: null,
            ws,
            hostname: "",
            port: 0,
            fetch: options.fetch,
        };
    });
}
async function serveStatic(req, options = {}) {
    var _a, _b, _c, _d, _e, _f;
    // @ts-ignore
    const kv = (_a = options.kv) !== null && _a !== void 0 ? _a : globalThis["__STATIC_CONTENT"];
    if (!kv) {
        return new Response("Service Unavailable", {
            status: 503,
            statusText: "Service Unavailable",
        });
    }
    const extraHeaders = (_b = options.headers) !== null && _b !== void 0 ? _b : {};
    const prefix = options.urlPrefix ? join(options.urlPrefix) : "";
    const url = new URL(req.url);
    const { pathname } = url;
    if (prefix && !startsWith(pathname, prefix)) {
        return new Response("Not Found", {
            status: 404,
            statusText: "Not Found",
            headers: extraHeaders,
        });
    }
    let filename = stripStart(pathname.slice(prefix.length), "/");
    if (filename === "/" || filename === ".") {
        filename = "";
    }
    if (pathname.endsWith("/")) {
        const indexHtml = filename ? join(filename, "index.html") : "index.html";
        const indexHtm = filename ? join(filename, "index.htm") : "index.htm";
        let indexPage = await kv.get(indexHtml, { type: "arrayBuffer" });
        if (indexPage) {
            return await serveFile(new Uint8Array(indexPage), {
                filename: indexHtml,
                reqHeaders: req.headers,
                extraHeaders,
                maxAge: (_c = options.maxAge) !== null && _c !== void 0 ? _c : 0,
            });
        }
        else if ((indexPage = await kv.get(indexHtm, { type: "arrayBuffer" }))) {
            return await serveFile(new Uint8Array(indexPage), {
                filename: indexHtm,
                reqHeaders: req.headers,
                extraHeaders,
                maxAge: (_d = options.maxAge) !== null && _d !== void 0 ? _d : 0,
            });
        }
        else if (!options.listDir) {
            return new Response("Forbidden", {
                status: 403,
                statusText: "Forbidden",
                headers: extraHeaders,
            });
        }
        else {
            const prefix = "$__MINIFLARE_SITES__$/";
            const dir = prefix + (filename ? encodeURIComponent(filename + "/") : "");
            const dirEntries = new Set();
            const fileEntries = new Set();
            let result = {
                keys: [],
                list_complete: false,
                cursor: null,
            };
            while (!result.list_complete) {
                result = await kv.list({ prefix: dir, cursor: (_e = result.cursor) !== null && _e !== void 0 ? _e : "" });
                for (const { name } of result.keys) {
                    const relativePath = decodeURIComponent(name.slice(dir.length));
                    const parts = relativePath.split("/");
                    if (parts.length === 2) { // direct folder
                        dirEntries.add(parts[0] + "/");
                    }
                    else if (parts.length === 1) { // direct file
                        fileEntries.add(parts[0]);
                    }
                }
            }
            const list = [
                ...[...dirEntries].sort(),
                ...[...fileEntries].sort(),
            ];
            if (pathname !== "/") {
                list.unshift("../");
            }
            return respondDir(list, pathname, extraHeaders);
        }
    }
    else if (filename) {
        const buffer = await kv.get(filename, { type: "arrayBuffer" });
        if (!buffer) {
            return new Response("Not Found", {
                status: 404,
                statusText: "Not Found",
                headers: extraHeaders,
            });
        }
        return await serveFile(new Uint8Array(buffer), {
            filename,
            reqHeaders: req.headers,
            extraHeaders,
            maxAge: (_f = options.maxAge) !== null && _f !== void 0 ? _f : 0,
        });
    }
    else {
        return Response.redirect(req.url + "/", 301);
    }
}
async function serveFile(data, options) {
    var _a, _b;
    const { filename, reqHeaders, extraHeaders } = options;
    const ext = extname(filename);
    const type = (_a = getMIME(ext)) !== null && _a !== void 0 ? _a : "";
    const rangeValue = reqHeaders.get("Range");
    let range;
    if (rangeValue && data.byteLength) {
        try {
            range = parseRange(rangeValue);
        }
        catch (_c) {
            return new Response("Invalid Range header", {
                status: 416,
                statusText: "Range Not Satisfiable",
                headers: extraHeaders,
            });
        }
    }
    const _etag = await etag(data);
    const headers = new Headers({
        ...extraHeaders,
        "Accept-Ranges": "bytes",
        "Etag": _etag,
    });
    const ifNoneMatchValue = reqHeaders.get("If-None-Match");
    const ifMatchValue = reqHeaders.get("If-Match");
    let modified = true;
    if (ifNoneMatchValue) {
        modified = ifNoneMatch(ifNoneMatchValue, _etag);
    }
    if (!modified) {
        return new Response(null, {
            status: 304,
            statusText: "Not Modified",
            headers,
        });
    }
    else if (ifMatchValue && range && !ifMatch(ifMatchValue, _etag)) {
        return new Response("Precondition Failed", {
            status: 412,
            statusText: "Precondition Failed",
            headers,
        });
    }
    if (type) {
        if (/^text\/|^application\/(json|yaml|toml|xml|javascript)$/.test(type)) {
            headers.set("Content-Type", type + "; charset=utf-8");
        }
        else {
            headers.set("Content-Type", type);
        }
    }
    else {
        headers.set("Content-Type", "application/octet-stream");
    }
    if (options.maxAge) {
        headers.set("Cache-Control", `public, max-age=${options.maxAge}`);
    }
    if (range) {
        const { ranges, suffix: suffixLength } = range;
        let start;
        let end;
        if (ranges.length) {
            ({ start } = ranges[0]);
            end = Math.min((_b = ranges[0].end) !== null && _b !== void 0 ? _b : data.byteLength - 1, data.byteLength - 1);
        }
        else {
            start = Math.max(data.byteLength - suffixLength, 0);
            end = data.byteLength - 1;
        }
        const slice = data.subarray(start, end + 1);
        headers.set("Content-Range", `bytes ${start}-${end}/${data.byteLength}`);
        headers.set("Content-Length", String(end - start + 1));
        return new Response(slice, {
            status: 206,
            statusText: "Partial Content",
            headers,
        });
    }
    else if (!data.byteLength) {
        headers.set("Content-Length", "0");
        return new Response("", {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
    else {
        headers.set("Content-Length", String(data.byteLength));
        return new Response(data, {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
}

export { etag, ifMatch, ifNoneMatch, parseRange, randomPort, serve, serveStatic, withWeb };
//# sourceMappingURL=http.js.map
