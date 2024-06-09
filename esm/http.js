import bytes from './bytes.js';
import { isDeno, isBun, isNode } from './env.js';
import { stat, exists, readFile, createReadableStream } from './fs.js';
import { sha256 } from './hash.js';
import { isMain } from './module.js';
import { as } from './object.js';
import { join } from './path.js';
import { stripStart } from './string.js';
import { startsWith } from './path/util.js';

/**
 * Utility functions for handling HTTP related tasks, such as parsing headers.
 * @module
 * @experimental
 */
/**
 * Parses the `Accept`, `Accept-Encoding` and `Accept-Language` headers.
 *
 * @example
 * ```ts
 * import { parseAccepts } from "@ayonli/jsext/http";
 *
 * const accepts = parseAccepts("text/html,application/xhtml+xml;q=0.9");
 * console.log(accepts);
 * // [
 * //     { value: "text/html", weight: 1 },
 * //     { value: "application/xhtml+xml", weight: 0.9 }
 * // ]
 *
 * const acceptEncodings = parseAccepts("gzip, deflate, br;q=0.8");
 * console.log(acceptEncodings);
 * // [
 * //     { value: "gzip", weight: 1 },
 * //     { value: "deflate", weight: 1 },
 * //     { value: "br", weight: 0.8 }
 * // ]
 *
 * const acceptLanguages = parseAccepts("en-US,en;q=0.9");
 * console.log(acceptLanguages);
 * // [
 * //     { value: "en-US", weight: 1 },
 * //     { value: "en", weight: 0.9 }
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
 *
 * @example
 * ```ts
 * import { parseContentType } from "@ayonli/jsext/http";
 *
 * const type = parseContentType("text/html; charset=utf-8");
 * console.log(type);
 * // { type: "text/html", charset: "utf-8" }
 *
 * const type2 = parseContentType("multipart/form-data; boundary=----WebKitFormBoundaryzjK4sVZ2QeZvz5zB");
 * console.log(type2);
 * // { type: "multipart/form-data", boundary: "----WebKitFormBoundaryzjK4sVZ2QeZvz5zB" }
 * ```
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
 *
 * @example
 * ```ts
 * import { parseCookie } from "@ayonli/jsext/http";
 *
 * const cookie = parseCookie("foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; HttpOnly; Secure; SameSite=Strict");
 * console.log(cookie);
 * // {
 * //     name: "foo",
 * //     value: "bar",
 * //     domain: "example.com",
 * //     path: "/",
 * //     expires: Wed Jun 09 2021 10:18:14 GMT+0000 (Coordinated Universal Time),
 * //     httpOnly: true,
 * //     secure: true,
 * //     sameSite: "Strict"
 * // }
 * ```
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
                cookie.sameSite = value;
            }
        }
    }
    return cookie;
}
/**
 * Converts a {@link Cookie} object to a string.
 *
 * @example
 * ```ts
 * import { stringifyCookie } from "@ayonli/jsext/http";
 *
 * const cookie = stringifyCookie({
 *     name: "foo",
 *     value: "bar",
 *     domain: "example.com",
 *     path: "/",
 *     expires: new Date("2021-06-09T10:18:14Z"),
 *     httpOnly: true,
 *     secure: true,
 *     sameSite: "Strict"
 * });
 * console.log(cookie);
 * // foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; HttpOnly; Secure; SameSite=Strict
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
    if (cookie.sameSite)
        str += `; SameSite=${cookie.sameSite}`;
    return str;
}
/**
 * Parses the `Range` header.
 *
 * @example
 * ```ts
 * import { parseRange } from "@ayonli/jsext/http";
 *
 * const range = parseRange("bytes=0-499");
 * console.log(range);
 * // { unit: "bytes", ranges: [{ start: 0, end: 499 }] }
 *
 * const range2 = parseRange("bytes=0-499,1000-1499");
 * console.log(range2);
 * // { unit: "bytes", ranges: [{ start: 0, end: 499 }, { start: 1000, end: 1499 }] }
 *
 * const range3 = parseRange("bytes=2000-");
 * console.log(range3);
 * // { unit: "bytes", ranges: [{ start: 2000 }] }
 *
 * const range4 = parseRange("bytes=-500");
 * console.log(range4);
 * // { unit: "bytes", ranges: [], suffix: 500 }
 * ```
 */
function parseRange(str) {
    if (!str.includes("=")) {
        throw new TypeError("Invalid Range header");
    }
    const [unit, ranges] = str.split("=").map((part) => part.trim());
    const parsed = { unit: unit, ranges: [] };
    for (const range of ranges.split(",")) {
        if (!range || !range.includes("-"))
            continue;
        const [start, end] = range.split("-").map((part) => part.trim());
        if (!start && !end) {
            continue;
        }
        else if (!start) {
            parsed.suffix = parseInt(end);
        }
        else if (!end) {
            parsed.ranges.push({ start: parseInt(start) });
        }
        else {
            parsed.ranges.push({ start: parseInt(start), end: parseInt(end) });
        }
    }
    if ((!parsed.ranges.length && !parsed.suffix) ||
        parsed.ranges.some((range) => range.start < 0 || (range.end && range.end <= range.start))) {
        throw new TypeError("Invalid Range header");
    }
    return parsed;
}
/**
 * Checks if the value from the `If-Match` header matches the given ETag.
 *
 * NOTE: Weak tags cannot be matched and will return `false`.
 *
 * @example
 * ```ts
 * import { etag, ifMatch } from "@ayonli/jsext/http";
 *
 * const _etag = await etag("Hello, World!");
 * const match = ifMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3YH", _etag);
 * console.log(match); // true
 * ```
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
 *
 * @example
 * ```ts
 * import { etag, ifNoneMatch } from "@ayonli/jsext/http";
 *
 * const _etag = await etag("Hello, World!");
 * const match = ifNoneMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3YH", _etag);
 * console.log(match); // false
 * ```
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
 *
 * @example
 * ```ts
 * import { stat } from "@ayonli/jsext/fs";
 * import { etag } from "@ayonli/jsext/http";
 *
 * const etag1 = await etag("Hello, World!");
 *
 * const data = new Uint8Array([1, 2, 3, 4, 5]);
 * const etag2 = await etag(data);
 *
 * const info = await stat("file.txt");
 * const etag3 = await etag(info);
 * ```
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
    for (const [key, value] of headers) {
        // Use `setHeader` to set headers instead of passing them to `writeHead`,
        // it seems in Deno, the headers are not written to the response if they
        // are passed to `writeHead`.
        nodeRes.setHeader(key, value);
    }
    nodeRes.writeHead(status, statusText);
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
async function serveStatic(req, options = {}) {
    var _a, _b, _c, _d, _e, _f;
    const dir = (_a = options.fsDir) !== null && _a !== void 0 ? _a : ".";
    const prefix = options.urlPrefix ? join(options.urlPrefix) : "";
    const url = new URL(req.url);
    if (prefix && !startsWith(url.pathname, prefix)) {
        return new Response("Not Found", { status: 404, statusText: "Not Found" });
    }
    const filename = join(dir, stripStart(url.pathname.slice(prefix.length), "/"));
    let info;
    try {
        info = await stat(filename);
    }
    catch (err) {
        if (((_b = as(err, Error)) === null || _b === void 0 ? void 0 : _b.name) === "NotFoundError") {
            return new Response(`Not Found`, { status: 404, statusText: "Not Found" });
        }
        else if (((_c = as(err, Error)) === null || _c === void 0 ? void 0 : _c.name) === "NotAllowedError") {
            return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
        }
        else {
            return new Response("Internal Server Error", {
                status: 500,
                statusText: "Internal Server Error",
            });
        }
    }
    if (info.kind === "directory") {
        if (!options.index) {
            return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
        }
        else if (!req.url.endsWith("/")) {
            return Response.redirect(req.url + "/", 301);
        }
        else {
            const _filename = join(filename, options.index);
            if (!(await exists(_filename))) {
                return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
            }
            else {
                return serveStatic(new Request(req.url + "" + options.index, { ...req }), options);
            }
        }
    }
    else if (info.kind !== "file") {
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    }
    const mtime = (_d = info.mtime) !== null && _d !== void 0 ? _d : new Date();
    const _etag = await etag(info);
    const headers = new Headers({
        ...((_e = options.headers) !== null && _e !== void 0 ? _e : {}),
        "Accept-Ranges": "bytes",
        "Last-Modified": mtime.toUTCString(),
        "Etag": _etag,
    });
    const ifModifiedSinceValue = req.headers.get("If-Modified-Since");
    const ifNoneMatchValue = req.headers.get("If-None-Match");
    let modified = true;
    if (ifModifiedSinceValue) {
        const date = new Date(ifModifiedSinceValue);
        modified = Math.floor(mtime.valueOf() / 1000) > Math.floor(date.valueOf() / 1000);
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
    if (/^text\/|^application\/(json|yaml|toml|xml|javascript)$/.test(info.type)) {
        headers.set("Content-Type", info.type + "; charset=utf-8");
    }
    else {
        headers.set("Content-Type", info.type || "application/octet-stream");
    }
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
        catch (_g) {
            return new Response("Invalid Range header", {
                status: 416,
                statusText: "Range Not Satisfiable",
            });
        }
        const { ranges, suffix: suffixLength } = range;
        let start;
        let end;
        if (ranges.length) {
            ({ start } = ranges[0]);
            end = Math.min((_f = ranges[0].end) !== null && _f !== void 0 ? _f : info.size - 1, info.size - 1);
        }
        else {
            start = Math.max(info.size - suffixLength, 0);
            end = info.size - 1;
        }
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
if (isMain(import.meta)) {
    if (isDeno) {
        Deno.serve({ port: 8000 }, req => serveStatic(req, { index: "index.html" }));
    }
    else if (isBun) {
        Bun.serve({
            port: 8000,
            fetch: (req) => serveStatic(req, { index: "index.html" }),
        });
        console.log("Listening on http://localhost:8000/");
    }
    else if (isNode) {
        import('node:http').then(async ({ createServer }) => {
            const server = createServer(withWeb(async (req) => {
                return serveStatic(req, { index: "index.html" });
            }));
            server.listen(8000);
            console.log("Listening on http://localhost:8000/");
        });
    }
}

export { etag, ifMatch, ifNoneMatch, parseAccepts, parseContentType, parseCookie, parseRange, serveStatic, stringifyCookie, withWeb };
//# sourceMappingURL=http.js.map
