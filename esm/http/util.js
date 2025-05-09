import bytes, { text, indexOfSlice, concat } from '../bytes.js';
import { sha256 } from '../hash/web.js';
import { stripEnd, stripStart, capitalize } from '../string.js';
export { getCookie, getCookies, parseCookie, parseCookies, setCookie, stringifyCookie, stringifyCookies } from './cookie.js';
export { parseUserAgent } from './user-agent.js';

/**
 * Parses the `Accept`, `Accept-Encoding` and `Accept-Language` headers.
 *
 * NOTE: This function automatically sorts the results by the q-factor value in
 * descending order.
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
        throw new SyntaxError("Invalid Content-Type header");
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
 * Sets the `Content-Disposition` header with the given filename when the
 * response is intended to be downloaded.
 *
 * This function encodes the filename with {@link encodeURIComponent} and sets
 * both the `filename` and the `filename*` parameters in the header for maximum
 * compatibility.
 *
 * NOTE: This function can be used with both {@link Response} and {@link Headers}
 * objects. However, when using with a `Headers` instance, make sure to set the
 * filename before the headers instance is used by the response object.
 *
 * @example
 * ```ts
 * import { setFilename } from "@ayonli/jsext/http";
 *
 * export default {
 *     fetch(req: Request) {
 *         const res = new Response("Hello, World!");
 *         setFilename(res, "hello.txt");
 *
 *        return res;
 *     }
 * }
 * ```
 */
function setFilename(res, filename) {
    filename = encodeURIComponent(filename);
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${filename}`;
    if (res instanceof Headers) {
        res.set("Content-Disposition", disposition);
    }
    else {
        res.headers.set("Content-Disposition", disposition);
    }
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
        throw new SyntaxError("Invalid Range header");
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
        throw new SyntaxError("Invalid Range header");
    }
    return parsed;
}
/**
 * Calculates the ETag for a given entity.
 *
 * NOTE: In Node.js, this function requires Node.js v19 or above, as it relies
 * on the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
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
    const tags = value.split(/\s*,\s*/).map((tag) => tag.startsWith("W/") ? stripEnd(stripStart(tag.slice(2), '"'), '"') : tag);
    return !tags.includes(etag);
}
/**
 * Parses the `Authorization` header with the `Basic` scheme.
 *
 * @example
 * ```ts
 * import { parseBasicAuth } from "@ayonli/jsext/http";
 *
 * const auth = parseBasicAuth("Basic cm9vdDpwYSQkdzByZA==");
 * console.log(auth);
 * // { username: "root", password: "pa$$w0rd" }
 * ```
 */
function parseBasicAuth(str) {
    const parts = str.split(" ");
    const scheme = parts[0].toLowerCase();
    const credentials = parts.slice(1).join(" ");
    if (!scheme || !credentials) {
        throw new SyntaxError("Invalid Authorization header");
    }
    else if (scheme !== "basic") {
        throw new TypeError("Authorization scheme is not 'Basic'");
    }
    else {
        const [username, password] = text(bytes(credentials, "base64")).split(":");
        return { username: username, password: password };
    }
}
/**
 * Performs basic authentication verification for the request. When passed, this
 * function returns nothing (`undefined`), otherwise it returns a `Response`
 * with status `401 Unauthorized`, which should be responded to the client.
 *
 * @example
 * ```ts
 * import { verifyBasicAuth, type BasicAuthorization } from "@ayonli/jsext/http";
 *
 * const users = new Map([
 *    ["root", "pa$$w0rd"]
 * ]);
 *
 * async function verify(auth: BasicAuthorization) {
 *     const password = users.get(auth.username);
 *     return !!password && password === auth.password;
 * }
 *
 * export default {
 *     async fetch(req) {
 *         const res = await verifyBasicAuth(req, verify);
 *
 *         if (res) {
 *             return res;
 *         }
 *
 *         // continue with the request
 *     },
 * };
 * ```
 */
async function verifyBasicAuth(req, verify) {
    const auth = req.headers.get("Authorization");
    if (auth === null || auth === void 0 ? void 0 : auth.startsWith("Basic ")) {
        try {
            const credentials = parseBasicAuth(auth);
            const ok = await verify(credentials);
            if (ok) {
                return;
            }
        }
        catch (_a) { }
    }
    const { host } = new URL(req.url);
    return new Response("Unauthorized", {
        status: 401,
        statusText: "Unauthorized",
        headers: {
            "WWW-Authenticate": `Basic realm="${host}"`,
        },
    });
}
const HTTP_METHODS = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "DELETE",
    "CONNECT",
    "OPTIONS",
    "TRACE",
    "PATCH",
];
const HTTP_STATUS = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    206: "Partial Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    413: "Payload Too Large",
    414: "URI Too Long",
    415: "Unsupported Media Type",
    416: "Range Not Satisfiable",
    417: "Expectation Failed",
    426: "Upgrade Required",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
};
function throwInvalidMessageError() {
    throw new SyntaxError("Invalid message");
}
function parseMessage(message) {
    const headerEnd = message.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
        throwInvalidMessageError();
    }
    const headers = new Headers();
    const headerLines = message.slice(0, headerEnd).split("\r\n");
    for (let i = 0; i < headerLines.length; i++) {
        const line = headerLines[i];
        const lineNum = i + 1;
        const index = line.indexOf(":");
        if (index === -1) {
            throw new SyntaxError("Invalid token in line " + lineNum);
        }
        const name = line.slice(0, index);
        const value = line.slice(index + 1).trim();
        try {
            headers.append(name, value);
        }
        catch (_a) {
            throw new SyntaxError(`Invalid header name '${name}' in line ${lineNum}`);
        }
    }
    let body = message.slice(headerEnd + 4);
    if (headers.get("Transfer-Encoding") === "chunked") {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const lineBreak = encoder.encode("\r\n");
        const chunks = [];
        let bodyBytes = encoder.encode(body);
        while (bodyBytes.length) {
            const lineEnd = indexOfSlice(bodyBytes, lineBreak);
            if (lineEnd === -1) {
                throw new SyntaxError("Invalid chunked body");
            }
            const length = parseInt(decoder.decode(bodyBytes.subarray(0, lineEnd)), 16);
            if (!Number.isInteger(length) || length < 0) {
                throw new SyntaxError("Invalid chunk length");
            }
            if (length === 0) { // end of chunked body
                break;
            }
            const chunkStart = lineEnd + 2;
            const chunkEnd = chunkStart + length;
            const chunk = bodyBytes.subarray(chunkStart, chunkEnd);
            if (chunk.length !== length) {
                throw new SyntaxError("Invalid chunk");
            }
            chunks.push(chunk);
            bodyBytes = bodyBytes.subarray(chunkEnd + 2);
        }
        body = concat(...chunks);
    }
    return { headers, body };
}
/**
 * Parses the text message as an HTTP request.
 *
 * **NOTE:** This function only supports HTTP/1.1 protocol.
 *
 * @experimental This function is experimental and may have some bugs.
 *
 * @example
 * ```ts
 * // GET example
 * import { parseRequest } from "@ayonli/jsext/http";
 *
 * const message = "GET /foo HTTP/1.1\r\nHost: example.com\r\n\r\n";
 * const req = parseRequest(message);
 *
 * console.log(req.method); // "GET"
 * console.log(req.url); // "http://example.com/foo"
 * console.log(req.headers.get("Host")); // "example.com"
 * ```
 *
 * @example
 * ```ts
 * // POST example
 * import { parseRequest } from "@ayonli/jsext/http";
 *
 * const message = "POST /foo HTTP/1.1\r\n"
 *     + "Host: example.com\r\n"
 *     + "Content-Type: application/x-www-form-urlencoded\r\n"
 *     + "Content-Length: 19\r\n"
 *     + "\r\n"
 *     + "foo=hello&bar=world";
 * const req = parseRequest(message);
 *
 * console.log(req.method); // "POST"
 * console.log(req.url); // "http://example.com/foo"
 * console.log(req.headers.get("Host")); // "example.com"
 *
 * const form = new URLSearchParams(await req.text());
 *
 * console.log(form.get("foo")); // "hello"
 * console.log(form.get("bar")); // "world"
 * ```
 */
function parseRequest(message) {
    var _a;
    let lineEnd = message.indexOf("\r\n");
    if (lineEnd === -1) {
        throwInvalidMessageError();
    }
    const [method, url, version] = message.slice(0, lineEnd).split(/\s+/);
    if (!method || !HTTP_METHODS.includes(method) ||
        !url || !url.startsWith("/") ||
        !(version === null || version === void 0 ? void 0 : version.startsWith("HTTP/"))) {
        throwInvalidMessageError();
    }
    else if (version !== "HTTP/1.1") {
        throw new TypeError("Unsupported HTTP version");
    }
    const { headers, body: _body } = parseMessage(message.slice(lineEnd + 2));
    let body = _body;
    if (method === "GET" || method === "HEAD") {
        if (body) {
            throw new SyntaxError("Request with GET/HEAD method cannot have body.");
        }
        else {
            body = null;
        }
    }
    const host = (_a = headers.get("Host")) !== null && _a !== void 0 ? _a : "";
    return new Request("http://" + host + url, {
        method,
        headers,
        body,
    });
}
/**
 * Parses the text message as an HTTP response.
 *
 * @experimental This function is experimental and may have some bugs.
 *
 * @example
 * ```ts
 * import { parseResponse } from "@ayonli/jsext/http";
 *
 * const message = "HTTP/1.1 200 OK\r\n"
 *     + "Content-Type: text/plain\r\n"
 *     + "Content-Length: 12\r\n"
 *     + "\r\n"
 *     + "Hello, World!";
 *
 * const res = parseResponse(message);
 *
 * console.log(res.status); // 200
 * console.log(res.statusText); // "OK"
 * console.log(res.headers.get("Content-Type")); // "text/plain"
 *
 * const text = await res.text();
 * console.log(text); // "Hello, World!"
 * ```
 */
function parseResponse(message) {
    let lineEnd = message.indexOf("\r\n");
    if (lineEnd === -1) {
        throwInvalidMessageError();
    }
    const [version, _status, ...statusTexts] = message.slice(0, lineEnd).split(/\s+/);
    const statusText = statusTexts.join(" ");
    let status;
    if (!(version === null || version === void 0 ? void 0 : version.startsWith("HTTP/")) ||
        !_status || !Number.isInteger((status = Number(_status)))) {
        throwInvalidMessageError();
    }
    const { headers, body: _body } = parseMessage(message.slice(lineEnd + 2));
    let body = _body;
    if (status === 204 || status === 304) {
        if (body) {
            throw new SyntaxError("Response with 204 or 304 status cannot have body.");
        }
        else {
            body = null;
        }
    }
    return new Response(body, {
        status,
        statusText,
        headers,
    });
}
/**
 * Converts the request object to text format.
 *
 * @example
 * ```ts
 * // GET example
 * import { stringifyRequest } from "@ayonli/jsext/http";
 *
 * const req = new Request("http://example.com/foo");
 * const message = await stringifyRequest(req);
 *
 * console.log(message);
 * // "GET /foo HTTP/1.1\r\nHost: example.com\r\n\r\n"
 * ```
 *
 * @example
 * ```ts
 * // POST example
 * import { stringifyRequest } from "@ayonli/jsext/http";
 *
 * const req = new Request("http://example.com/foo", {
 *     method: "POST",
 *     headers: {
 *         "Content-Type": "application/x-www-form-urlencoded",
 *     },
 *     body: "foo=hello&bar=world",
 * });
 * const message = await stringifyRequest(req);
 *
 * console.log(message);
 * // "POST /foo HTTP/1.1\r\n" +
 * // "Host: example.com\r\n" +
 * // "Content-Type: application/x-www-form-urlencoded\r\n" +
 * // "Content-Length: 19\r\n" +
 * // "\r\n" +
 * // "foo=hello&bar=world"
 * ```
 */
async function stringifyRequest(req) {
    const { host, pathname } = new URL(req.url);
    let message = `${req.method} ${pathname} HTTP/1.1\r\n`;
    let body = req.body ? await req.text() : "";
    if (host && !req.headers.has("Host")) {
        message += `Host: ${host}\r\n`;
    }
    for (const [name, value] of req.headers) {
        message += `${capitalize(name, true)}: ${value}\r\n`;
    }
    if (body && !req.headers.has("Content-Length")) {
        message += `Content-Length: ${bytes(body).length}\r\n`;
    }
    message += "\r\n" + body;
    return message;
}
/**
 * Converts the response object to text format.
 *
 * @example
 * ```ts
 * import { stringifyResponse } from "@ayonli/jsext/http";
 *
 * const res = new Response("Hello, World!", {
 *     status: 200,
 *     statusText: "OK",
 *     headers: {
 *         "Content-Type": "text/plain",
 *     },
 * });
 * const message = await stringifyResponse(res);
 *
 * console.log(message);
 * // "HTTP/1.1 200 OK\r\n" +
 * // "Content-Type: text/plain\r\n" +
 * // "Content-Length: 12\r\n" +
 * // "\r\n" +
 * // "Hello, World!"
 * ```
 */
async function stringifyResponse(res) {
    const statusText = res.statusText;
    let message = `HTTP/1.1 ${res.status}${statusText ? " " + statusText : ""}\r\n`;
    let body = res.body ? await res.text() : "";
    for (const [name, value] of res.headers) {
        message += `${capitalize(name, true)}: ${value}\r\n`;
    }
    if (body && !res.headers.has("Content-Length")) {
        message += `Content-Length: ${bytes(body).length}\r\n`;
    }
    message += "\r\n" + body;
    return message;
}
/**
 * Gets the suggested response type for the request.
 *
 * This function checks the `Accept` or the `Content-Type` header of the request,
 * or the request method, or other factors to determine the most suitable
 * response type for the client.
 *
 * For example, when requesting an article which is stored in markdown, the
 * server can respond an HTML page for the browser, a plain text for the
 * terminal, or a JSON object for the API client.
 *
 * This function returns the following response types:
 *
 * - `text`: plain text content (default)
 * - `html`: an HTML page
 * - `xml`: an XML document
 * - `json`: a JSON object
 * - `stream`: text stream or binary stream, depending on the use case
 * - `none`: no content should be sent, such as for a `HEAD` request
 *
 * @example
 * ```ts
 * import { suggestResponseType } from "@ayonli/jsext/http";
 *
 * export default {
 *     async fetch(req: Request) {
 *         const type = suggestResponseType(req);
 *
 *         if (type === "text") {
 *              return new Response("Hello, World!");
 *         } else if (type === "html") {
 *              return new Response("<h1>Hello, World!</h1>", {
 *                  headers: { "Content-Type": "text/html" },
 *              });
 *         } else if (type === "xml") {
 *              return new Response("<xml><message>Hello, World!</message></xml>", {
 *                  headers: { "Content-Type": "application/xml" },
 *              });
 *         } else if (type === "json") {
 *              return new Response(JSON.stringify({ message: "Hello, World!" }), {
 *                  headers: { "Content-Type": "application/json" },
 *              });
 *         } else {
 *             return new Response(null, { status: 204 });
 *         }
 *     }
 * }
 * ```
 */
function suggestResponseType(req) {
    var _a;
    const accepts = req.headers.get("Accept");
    const accept = accepts
        ? (_a = parseAccepts(accepts).sort((a, b) => b.weight - a.weight)[0]) === null || _a === void 0 ? void 0 : _a.type
        : null;
    const acceptAll = !accept || accept === "*/*";
    const contentType = req.headers.get("Content-Type");
    const fetchDest = req.headers.get("Sec-Fetch-Dest") || req.destination;
    const xhr = req.headers.get("X-Requested-With") === "XMLHttpRequest";
    if (req.method === "HEAD" || req.method === "OPTIONS") {
        return "none";
    }
    else if ((accept === null || accept === void 0 ? void 0 : accept.includes("text/event-stream"))
        || (accept === null || accept === void 0 ? void 0 : accept.includes("application/octet-stream"))
        || (accept === null || accept === void 0 ? void 0 : accept.includes("multipart/form-data"))
        || /(image|audio|video)\//.test(accept !== null && accept !== void 0 ? accept : "")
        || ["font", "image", "audio", "video", "object", "embed"].includes(fetchDest)) {
        return "stream";
    }
    else if ((accept === null || accept === void 0 ? void 0 : accept.includes("/json"))
        || (acceptAll && ((contentType === null || contentType === void 0 ? void 0 : contentType.includes("json")) || xhr))
        || fetchDest === "manifest") {
        return "json";
    }
    else if ((accept === null || accept === void 0 ? void 0 : accept.includes("/xml"))
        || (acceptAll && (contentType === null || contentType === void 0 ? void 0 : contentType.includes("xml")))
        || fetchDest === "xslt") {
        return "xml";
    }
    else if ((accept === null || accept === void 0 ? void 0 : accept.includes("/html"))
        || fetchDest === "document") {
        return "html";
    }
    else {
        const { pathname } = new URL(req.url);
        if (pathname === "/api" ||
            pathname.startsWith("/api/") ||
            /\.json?$/i.test(pathname)) {
            return "json";
        }
        else if (/\.xml$/i.test(pathname)) {
            return "xml";
        }
        else if (/\.html?$/i.test(pathname)) {
            return "html";
        }
        else {
            return "text";
        }
    }
}

export { HTTP_METHODS, HTTP_STATUS, etag, ifMatch, ifNoneMatch, parseAccepts, parseBasicAuth, parseContentType, parseRange, parseRequest, parseResponse, setFilename, stringifyRequest, stringifyResponse, suggestResponseType, verifyBasicAuth };
//# sourceMappingURL=util.js.map
