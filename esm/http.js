import bytes from './bytes.js';
import { stat, readFile, createReadableStream } from './fs.js';
import { sha256 } from './hash.js';
import { join } from './path.js';
import { startsWith } from './path/util.js';

/**
 * Utility functions for handling HTTP related tasks, such as parsing headers.
 * @module
 */
/**
 * Parses the `Accept`, `Accept-Encoding` and `Accept-Language` headers.
 *
 * @example
 * ```ts
 * import { parseAccepts } from "@ayonli/jsext/http";
 *
 * const accept = parseAccepts("text/html,application/xhtml+xml;q=0.9");
 * console.log(accept);
 * // [
 * //     { value: "text/html", weight: 1 },
 * //     { value: "application/xhtml+xml", weight: 0.9 }
 * // ]
 * ```
 */
function parseAccepts(str) {
    return str.split(",").map((type) => {
        const [value, weight] = type.split(";q=");
        return {
            type: value.trim(),
            weight: weight ? parseFloat(weight) : 1,
        };
    }).sort((a, b) => b.weight - a.weight);
}
/**
 * Parses the `Content-Type` header.
 */
function parseContentType(str) {
    const [type, ...params] = str.split(";").map((part) => part.trim());
    if (!(type === null || type === void 0 ? void 0 : type.includes("/"))) {
        throw new TypeError("Invalid Content-Type header");
    }
    const parsed = { type: type };
    for (const param of params) {
        if (param) {
            const [key, value] = param.split("=");
            if (key === "charset") {
                parsed.charset = value !== null && value !== void 0 ? value : "";
            }
            else if (key === "boundary") {
                parsed.boundary = value !== null && value !== void 0 ? value : "";
            }
        }
    }
    return parsed;
}
/**
 * Parses the `Set-Cookie` header.
 */
function parseCookie(str) {
    const [nameValue, ...params] = str.split(";").map((part) => part.trim());
    if (!nameValue || !nameValue.includes("=")) {
        throw new TypeError("Invalid Set-Cookie header");
    }
    const [name, value] = nameValue.split("=");
    const cookie = { name: name, value: value };
    for (const param of params) {
        if (param) {
            const [key, value = ""] = param.split("=");
            if (key === "Domain") {
                cookie.domain = value;
            }
            else if (key === "Expires") {
                cookie.expires = new Date(value);
            }
            else if (key === "Max-Age") {
                cookie.maxAge = parseInt(value);
            }
            else if (key === "HttpOnly") {
                cookie.httpOnly = true;
            }
            else if (key === "Secure") {
                cookie.secure = true;
            }
            else if (key === "Path") {
                cookie.path = value;
            }
            else if (key === "SameSite") {
                cookie.sameSize = value;
            }
        }
    }
    return cookie;
}
/**
 * Converts a {@link Cookie} object to a string.
 */
function stringifyCookie(cookie) {
    let str = `${cookie.name}=${cookie.value}`;
    if (cookie.domain)
        str += `; Domain=${cookie.domain}`;
    if (cookie.path)
        str += `; Path=${cookie.path}`;
    if (cookie.expires)
        str += `; Expires=${cookie.expires.toUTCString()}`;
    if (cookie.maxAge)
        str += `; Max-Age=${cookie.maxAge}`;
    if (cookie.httpOnly)
        str += "; HttpOnly";
    if (cookie.secure)
        str += "; Secure";
    if (cookie.sameSize)
        str += `; SameSite=${cookie.sameSize}`;
    return str;
}
/**
 * Parses the `Range` header.
 */
function parseRange(str) {
    if (!str.includes("=")) {
        throw new TypeError("Invalid Range header");
    }
    const [unit, ...ranges] = str.split("=").map((part) => part.trim());
    const parsed = { unit: unit, ranges: [] };
    for (const range of ranges) {
        if (!range || !range.includes("-"))
            continue;
        const [start, end] = range.split("-").map((part) => part.trim());
        if (!start && !end) {
            continue;
        }
        else if (!start) {
            parsed.ranges.push({ start: 0, end: parseInt(end) });
        }
        else if (!end) {
            parsed.ranges.push({ start: parseInt(start) });
        }
        else {
            parsed.ranges.push({ start: parseInt(start), end: parseInt(end) });
        }
    }
    if (!parsed.ranges.length ||
        parsed.ranges.some((range) => range.start < 0 || (range.end && range.end <= range.start))) {
        throw new TypeError("Invalid Range header");
    }
    return parsed;
}
/**
 * Checks if the value from the `If-Match` header matches the given ETag.
 */
function ifMatch(value, etag) {
    // Weak tags cannot be matched and return false.
    if (!value || etag.startsWith("W/")) {
        return false;
    }
    if (value.trim() === "*") {
        return true;
    }
    const tags = value.split(/\s*,\s*/);
    return tags.includes(etag);
}
/**
 * Checks if the value from the `If-None-Match` header matches the given ETag.
 */
function ifNoneMatch(value, etag) {
    if (!value) {
        return true;
    }
    if (value.trim() === "*") {
        return false;
    }
    const tags = value.split(/\s*,\s*/).map((tag) => tag.startsWith("W/") ? tag.slice(2) : tag);
    return !tags.includes(etag);
}
/**
 * Calculates the ETag for a given entity.
 */
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
/**
 * Creates a Node.js HTTP request listener with modern Web APIs.
 *
 * NOTE: This function requires Node.js v18.4.1 or above.
 *
 * @example
 * ```ts
 * import * as http from "node:http";
 * import { withWeb } from "@ayonli/jsext/http";
 *
 * const server = http.createServer(withWeb(async (req) => {
 *     return new Response("Hello, World!");
 * }));
 *
 * server.listen(8000);
 * ```
 */
function withWeb(listener) {
    return async (nReq, nRes) => {
        const req = toWebRequest(nReq);
        const res = await listener(req);
        if (res && !nRes.headersSent) {
            if (res.status === 101) {
                // When the status code is 101, it means the server is upgrading
                // the connection to a different protocol, usually to WebSocket.
                // In this case, the response shall be and may have already been
                // written by the request socket. So we should not write the
                // response again.
                return;
            }
            toNodeResponse(res, nRes);
        }
    };
}
/**
 * Transforms a Node.js HTTP request to a modern `Request` object.
 */
function toWebRequest(req) {
    var _a;
    const protocol = req.socket["encrypted"] ? "https" : "http";
    const url = new URL((_a = req.url) !== null && _a !== void 0 ? _a : "/", `${protocol}://${req.headers.host}`);
    const headers = new Headers(req.headers);
    const init = {
        method: req.method,
        headers,
    };
    const cache = headers.get("Cache-Control");
    const mode = headers.get("Sec-Fetch-Mode");
    const referrer = headers.get("Referer");
    if (cache === "no-cache") {
        init.cache = "no-cache";
    }
    else if (cache === "no-store") {
        init.cache = "no-store";
    }
    else if (cache === "only-if-cached" && mode === "same-origin") {
        init.cache = "only-if-cached";
    }
    else {
        init.cache = "default";
    }
    if (mode === "no-cors") {
        init.mode = "no-cors";
    }
    else if (mode === "same-origin") {
        init.mode = "same-origin";
    }
    else {
        init.mode = "cors";
    }
    if (referrer) {
        init.referrer = referrer;
    }
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        req.on("data", (chunk) => {
            writer.write(chunk);
        }).once("error", (err) => {
            writer.abort(err);
        }).once("end", () => {
            writer.close();
        });
        init.body = readable;
        // @ts-ignore Node.js special
        init.duplex = "half";
    }
    const request = new Request(url, init);
    Object.assign(request, {
        [Symbol.for("incomingMessage")]: req,
    });
    return request;
}
/**
 * Pipes a modern `Response` object to a Node.js HTTP response.
 */
function toNodeResponse(res, nodeRes) {
    const { status, statusText, headers } = res;
    nodeRes.writeHead(status, statusText, Object.fromEntries(headers.entries()));
    if (!res.body) {
        nodeRes.end();
    }
    else {
        res.body.pipeTo(new WritableStream({
            write(chunk) {
                nodeRes.write(chunk);
            },
            close() {
                nodeRes.end();
            },
            abort(err) {
                nodeRes.destroy(err);
            },
        }));
    }
}
/**
 * Serves static files from a file system directory.
 *
 * @example
 * ```ts
 * import { serveStatic } from "@ayonli/jsext/http";
 *
 * export default {
 *     async fetch(req: Request) {
 *         const { pathname } = new URL(req.url);
 *
 *         if (pathname.startsWith("/assets")) {
 *             return await serveStatic(req, {
 *                 fsDir: "./public",
 *                 urlPrefix: "/assets",
 *             });
 *         }
 *
 *         return new Response("Hello, World!");
 *     }
 * };
 * ```
 */
async function serveStatic(req, options) {
    var _a, _b;
    const url = new URL(req.url);
    if (!startsWith(url.pathname, options.urlPrefix)) {
        return new Response("Not Found", { status: 404, statusText: "Not Found" });
    }
    const prefix = join(options.urlPrefix);
    const filename = join(options.fsDir, url.pathname.slice(prefix.length + 1));
    const info = await stat(filename);
    if (info.kind === "directory") {
        if (!options.index) {
            return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
        }
        else {
            return serveStatic(req, {
                ...options,
                urlPrefix: join(prefix, options.index),
            });
        }
    }
    else if (info.kind !== "file") {
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    }
    const mtime = (_a = info.mtime) !== null && _a !== void 0 ? _a : new Date();
    const _etag = await etag(info);
    const headers = new Headers({
        "Accept-Ranges": "bytes",
        "Last-Modified": mtime.toUTCString(),
        "Etag": _etag,
    });
    const ifModifiedSinceValue = req.headers.get("If-Modified-Since");
    const ifNoneMatchValue = req.headers.get("If-None-Match");
    let modified = false;
    if (ifModifiedSinceValue) {
        const ifModifiedSince = new Date(ifModifiedSinceValue);
        modified = mtime > ifModifiedSince;
    }
    else if (ifNoneMatchValue) {
        modified = ifNoneMatch(ifNoneMatchValue, _etag);
    }
    if (!modified) {
        return new Response(null, {
            status: 304,
            statusText: "Not Modified",
            headers,
        });
    }
    headers.set("Content-Disposition", `inline; filename="${info.name}"`);
    headers.set("Content-Type", info.type + "; charset=utf-8");
    if (info.atime) {
        headers.set("Date", info.atime.toUTCString());
    }
    if (options.maxAge) {
        headers.set("Cache-Control", `public, max-age=${options.maxAge}`);
    }
    const rangeValue = req.headers.get("Range");
    if (rangeValue && info.size) {
        let range;
        try {
            range = parseRange(rangeValue);
        }
        catch (_c) {
            return new Response("Invalid Range header", {
                status: 416,
                statusText: "Range Not Satisfiable",
            });
        }
        const { ranges } = range;
        const { start } = ranges[0];
        const end = Math.min((_b = ranges[0].end) !== null && _b !== void 0 ? _b : info.size - 1, info.size - 1);
        const data = await readFile(filename);
        const slice = data.subarray(start, end + 1);
        headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
        headers.set("Content-Length", String(end - start + 1));
        return new Response(slice, {
            status: 206,
            statusText: "Partial Content",
            headers,
        });
    }
    else if (!info.size) {
        headers.set("Content-Length", "0");
        return new Response("", {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
    else {
        headers.set("Content-Length", String(info.size));
        return new Response(createReadableStream(filename), {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
}

export { etag, ifMatch, ifNoneMatch, parseAccepts, parseContentType, parseCookie, parseRange, serveStatic, stringifyCookie, withWeb };
//# sourceMappingURL=http.js.map
