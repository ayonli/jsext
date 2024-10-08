/**
 * Utility functions for handling HTTP related tasks, such as parsing headers.
 * @module
 * @experimental
 */

import bytes, { text } from "../bytes.ts";
import { capitalize, stripEnd, stripStart } from "../string.ts";

export * from "./user-agent.ts";

/**
 * Represents the HTTP request `Accept`, `Accept-Encoding` and `Accept-Language`
 * headers.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
 */
export interface Accept {
    /**
     * The MIME type of the `Accept` header, the encoding of the
     * `Accept-Encoding` header, or the language of the `Accept-Language` header.
     */
    type: string;
    /**
     * q-factor value, which represents the relative quality factor of the media
     * type, encoding or language.
     */
    weight: number;
}

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
export function parseAccepts(str: string): Accept[] {
    return str.split(",").map((type) => {
        const [value, weight] = type.split(";q=") as [string, string?];
        return {
            type: value.trim(),
            weight: weight ? parseFloat(weight) : 1,
        };
    }).sort((a, b) => b.weight - a.weight);
}

/**
 * Represents the HTTP request or response `Content-Type` header.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
 */
export interface ContentType {
    /**
     * The MIME type of the resource.
     */
    type: string;
    /**
     * The character encoding of the resource.
     */
    charset?: string;
    /**
     * The boundary string used in `multipart/*` types.
     */
    boundary?: string;
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
export function parseContentType(str: string): ContentType {
    const [type, ...params] = str.split(";").map((part) => part.trim());

    if (!type?.includes("/")) {
        throw new TypeError("Invalid Content-Type header");
    }

    const parsed: ContentType = { type: type! };

    for (const param of params) {
        if (param) {
            const [key, value] = param.split("=");

            if (key === "charset") {
                parsed.charset = value ?? "";
            } else if (key === "boundary") {
                parsed.boundary = value ?? "";
            }
        }
    }

    return parsed;
}

/**
 * Represents an HTTP Cookie.
 * 
 * @sse https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CookieStore/get
 */
export interface Cookie {
    /**
     * The name of the cookie.
     */
    name: string;
    /**
     * The value of the cookie.
     */
    value: string;
    /**
     * Defines the host to which the cookie will be sent.
     */
    domain?: string;
    /**
     * Indicates the path that must exist in the requested URL for the browser
     * to send the Cookie header.
     */
    path?: string;
    /**
     * The expiration time of the cookie in milliseconds since the Unix epoch.
     * If the value is equal to or less than the current time, the cookie will
     * be expired immediately.
     */
    expires?: number;
    /**
     * The number of seconds until the cookie expires. A zero or negative number
     * will expire the cookie immediately. If both `expires` and `maxAge` are
     * present, `maxAge` has precedence.
     */
    maxAge?: number;
    /**
     * Controls whether or not a cookie is sent with cross-site requests,
     * providing some protection against cross-site request forgery attacks
     * (CSRF).
     * 
     * - `strict`: The cookie will only be sent in a first-party context and not
     *   be sent with requests initiated by third party websites.
     * - `lax`: The cookie is not sent on normal cross-site sub-requests (for
     *   example to load images or frames into a third party site), but is sent
     *   when a user is navigating within the origin site (i.e. when following a
     *   link). When `sameSite` is not specified, this is the default behavior.
     * - `none`: The cookie will be sent in all contexts.
     */
    sameSite?: "strict" | "lax" | "none";
    /**
     * Forbids JavaScript from accessing the cookie, for example, through the
     * `document.cookie` property.
     */
    httpOnly?: boolean;
    /**
     * Whether the cookie is to be used in secure contexts only, that is over
     * HTTPS.
     */
    secure?: boolean;
    /**
     * Indicates that the cookie should be stored using partitioned storage.
     * @see https://developer.mozilla.org/en-US/docs/Web/Privacy/Privacy_sandbox/Partitioned_cookies
     */
    partitioned?: boolean;
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
 * //     expires: 1623233894000,
 * //     httpOnly: true,
 * //     secure: true,
 * //     sameSite: "strict"
 * // }
 * ```
 */
export function parseCookie(str: string): Cookie {
    const [nameValue, ...params] = str.split(";").map((part) => part.trim());

    if (!nameValue || !nameValue.includes("=")) {
        throw new TypeError("Invalid Set-Cookie header");
    }

    const [name, value] = nameValue!.split("=");
    const cookie: Cookie = { name: name!, value: value! };

    for (const param of params) {
        if (param) {
            const [key, value = ""] = param.split("=");

            if (key === "Domain") {
                cookie.domain = value;
            } else if (key === "Expires") {
                cookie.expires = new Date(value).valueOf();
            } else if (key === "Max-Age") {
                cookie.maxAge = parseInt(value);
            } else if (key === "HttpOnly") {
                cookie.httpOnly = true;
            } else if (key === "Secure") {
                cookie.secure = true;
            } else if (key === "Path") {
                cookie.path = value || "/";
            } else if (key === "SameSite" && value) {
                cookie.sameSite = value.toLowerCase() as "strict" | "lax" | "none";
            } else if (key === "Partitioned") {
                cookie.partitioned = true;
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
export function stringifyCookie(cookie: Cookie): string {
    let str = `${cookie.name}=${cookie.value}`;

    if (cookie.domain)
        str += `; Domain=${cookie.domain}`;

    if (cookie.path)
        str += `; Path=${cookie.path}`;

    if (cookie.expires)
        str += `; Expires=${new Date(cookie.expires).toUTCString()}`;

    if (cookie.maxAge)
        str += `; Max-Age=${cookie.maxAge}`;

    if (cookie.httpOnly)
        str += "; HttpOnly";

    if (cookie.secure)
        str += "; Secure";

    if (cookie.sameSite)
        str += `; SameSite=${capitalize(cookie.sameSite)}`;

    if (cookie.partitioned)
        str += "; Partitioned";

    return str;
}

/**
 * Parses the `Cookie` header or the `document.cookie` property.
 */
export function parseCookies(str: string): Cookie[] {
    return !str ? [] : str.split(/;\s*/g).reduce((cookies, part) => {
        const [name, value] = part.split("=") as [string, string?];

        if (name && value !== undefined) {
            cookies.push({ name, value });
        }

        return cookies;
    }, [] as Cookie[]);
}

/**
 * Converts a list of cookies to a string that can be used in the `Cookie`
 * header.
 */
export function stringifyCookies(cookies: Cookie[]): string {
    return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

/**
 * Gets the cookies from the `Cookie` header of the request or the `Set-Cookie`
 * header of the response.
 * 
 * @example
 * ```ts
 * import { getCookies } from "@ayonli/jsext/http";
 * 
 * export default {
 *     fetch(req: Request) {
 *         const cookies = getCookies(req);
 *         console.log(cookies);
 * 
 *         return new Response("Hello, World!");
 *     }
 * }
 * ```
 */
export function getCookies(obj: Request | Response): Cookie[] {
    if ("ok" in obj && "status" in obj) {
        return obj.headers.getSetCookie().map(str => parseCookie(str));
    } else {
        return parseCookies(obj.headers.get("Cookie") ?? "");
    }
}

/**
 * Gets the cookie by the given `name` from the `Cookie` header of the request
 * or the `Set-Cookie` header of the response.
 * 
 * @example
 * ```ts
 * import { getCookie } from "@ayonli/jsext/http";
 * 
 * export default {
 *     fetch(req: Request) {
 *         const cookie = getCookie(req, "foo");
 *         console.log(cookie);
 * 
 *         return new Response("Hello, World!");
 *     }
 * }
 * ```
 */
export function getCookie(obj: Request | Response, name: string): Cookie | null {
    return getCookies(obj).find(cookie => cookie.name === name) ?? null;
}

/**
 * Sets a cookie in the `Set-Cookie` header of the response.
 * 
 * NOTE: This function can be used with both {@link Response} and {@link Headers}
 * objects. However, when using with a `Headers` instance, make sure to set the
 * cookie before the headers instance is used by the response object.
 * 
 * @example
 * ```ts
 * import { setCookie } from "@ayonli/jsext/http";
 * 
 * export default {
 *     fetch(req: Request) {
 *         const res = new Response("Hello, World!");
 *         setCookie(res, { name: "hello", value: "world" });
 * 
 *         return res;
 *     }
 * }
 * ```
 */
export function setCookie(res: Response | Headers, cookie: Cookie): void {
    if (res instanceof Headers) {
        res.append("Set-Cookie", stringifyCookie(cookie));
    } else {
        res.headers.append("Set-Cookie", stringifyCookie(cookie));
    }
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
export function setFilename(res: Response | Headers, filename: string): void {
    filename = encodeURIComponent(filename);
    const disposition = `attachment; filename="${filename}"; filename*=UTF-8''${filename}`;

    if (res instanceof Headers) {
        res.set("Content-Disposition", disposition);
    } else {
        res.headers.set("Content-Disposition", disposition);
    }
}

/**
 * Represents the HTTP request `Range` header.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
 */
export interface Range {
    /**
     * The unit in which ranges are specified, usually `bytes`.
     */
    unit: string;
    /**
     * The ranges of units requested.
     */
    ranges: { start: number; end?: number; }[];
    /**
     * The number of units at the end of the resource requested.
     */
    suffix?: number;
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
export function parseRange(str: string): Range {
    if (!str.includes("=")) {
        throw new TypeError("Invalid Range header");
    }

    const [unit, ranges] = str.split("=").map((part) => part.trim());
    const parsed: Range = { unit: unit!, ranges: [] };

    for (const range of ranges!.split(",")) {
        if (!range || !range.includes("-"))
            continue;

        const [start, end] = range.split("-").map((part) => part.trim());

        if (!start && !end) {
            continue;
        } else if (!start) {
            parsed.suffix = parseInt(end!);
        } else if (!end) {
            parsed.ranges.push({ start: parseInt(start) });
        } else {
            parsed.ranges.push({ start: parseInt(start), end: parseInt(end) });
        }
    }

    if ((!parsed.ranges.length && !parsed.suffix) ||
        parsed.ranges.some((range) => range.start < 0 || (range.end && range.end <= range.start))
    ) {
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
export function ifMatch(value: string | null, etag: string): boolean {
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
export function ifNoneMatch(value: string | null, etag: string): boolean {
    if (!value) {
        return true;
    }

    if (value.trim() === "*") {
        return false;
    }

    const tags = value.split(/\s*,\s*/).map((tag) =>
        tag.startsWith("W/") ? stripEnd(stripStart(tag.slice(2), '"'), '"') : tag
    );
    return !tags.includes(etag);
}

/**
 * Represents the HTTP request `Authorization` header with the `Basic` scheme.
 */
export interface BasicAuthorization {
    username: string;
    password: string;
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
export function parseBasicAuth(str: string): BasicAuthorization {
    const parts = str.split(" ");
    const scheme = parts[0]!.toLowerCase();
    const credentials = parts.slice(1).join(" ");

    if (!scheme || !credentials) {
        throw new TypeError("Invalid Authorization header");
    } else if (scheme !== "basic") {
        throw new TypeError("Authorization scheme is not 'Basic'");
    } else {
        const [username, password] = text(bytes(credentials, "base64")).split(":");
        return { username: username!, password: password! };
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
export async function verifyBasicAuth(
    req: Request,
    verify: (auth: BasicAuthorization) => boolean | Promise<boolean>
): Promise<void | Response> {
    const auth = req.headers.get("Authorization");

    if (auth?.startsWith("Basic ")) {
        try {
            const credentials = parseBasicAuth(auth);
            const ok = await verify(credentials);

            if (ok) {
                return;
            }
        } catch { }
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

export const HTTP_METHODS = [
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
export const HTTP_STATUS = {
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

function parseMessage(message: string): { headers: Headers, body: string; } {
    const headerEnd = message.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
        throw new TypeError("Invalid message");
    }

    const headers = new Headers();
    const headerLines = message.slice(0, headerEnd).split("\r\n");

    for (let i = 0; i < headerLines.length; i++) {
        const line = headerLines[i]!;
        const lineNum = i + 1;
        const index = line.indexOf(":");

        if (index === -1) {
            throw new SyntaxError("Invalid token in line " + lineNum);
        }

        const name = line.slice(0, index);
        const value = line.slice(index + 1).trim();

        try {
            headers.append(name, value);
        } catch {
            throw new TypeError(`Invalid header name '${name}' in line ${lineNum}`);
        }
    }

    const body = message.slice(headerEnd + 4);
    return { headers, body };
}

/**
 * Parses the text message as an HTTP request.
 * 
 * **NOTE:** This function only supports HTTP/1.1 protocol.
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
export function parseRequest(message: string): Request {
    let lineEnd = message.indexOf("\r\n");
    if (lineEnd === -1) {
        throw new TypeError("Invalid message");
    }

    const [method, url, version] = message.slice(0, lineEnd).split(/\s+/);

    if (!method || !HTTP_METHODS.includes(method) ||
        !url || !url.startsWith("/") ||
        !version?.startsWith("HTTP/")
    ) {
        throw new TypeError("Invalid message");
    } else if (version !== "HTTP/1.1") {
        throw new TypeError("Unsupported HTTP version");
    }

    const { headers, body: _body } = parseMessage(message.slice(lineEnd + 2));
    let body: string | null = _body;

    if (method === "GET" || method === "HEAD") {
        if (body) {
            throw new TypeError("Request with GET/HEAD method cannot have body.");
        } else {
            body = null;
        }
    }

    const host = headers.get("Host") ?? "";

    return new Request("http://" + host + url, {
        method,
        headers,
        body,
    });
}

/**
 * Parses the text message as an HTTP response.
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
export function parseResponse(message: string): Response {
    let lineEnd = message.indexOf("\r\n");
    if (lineEnd === -1) {
        throw new TypeError("Invalid message");
    }

    const [version, _status, ...statusTexts] = message.slice(0, lineEnd).split(/\s+/);
    const statusText = statusTexts.join(" ");
    let status: number;

    if (!version?.startsWith("HTTP/") ||
        !_status || !Number.isInteger((status = Number(_status))) ||
        !statusText
    ) {
        throw new TypeError("Invalid message");
    }

    const { headers, body: _body } = parseMessage(message.slice(lineEnd + 2));
    let body: string | null = _body;

    if (status === 204 || status === 304) {
        if (body) {
            throw new SyntaxError("Response with 204 or 304 status cannot have body.");
        } else {
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
export async function stringifyRequest(req: Request): Promise<string> {
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
export async function stringifyResponse(res: Response): Promise<string> {
    const statusText = res.statusText || (HTTP_STATUS as Record<number, string>)[res.status] || "";
    let message = `HTTP/1.1 ${res.status} ${statusText}\r\n`;
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
export function suggestResponseType(
    req: Request
): "text" | "html" | "xml" | "json" | "stream" | "none" {
    const accepts = req.headers.get("Accept");
    const accept = accepts
        ? parseAccepts(accepts).sort((a, b) => b.weight - a.weight)[0]?.type
        : null;
    const acceptAll = !accept || accept === "*/*";
    const contentType = req.headers.get("Content-Type");
    const fetchDest = req.headers.get("Sec-Fetch-Dest") || req.destination;
    const xhr = req.headers.get("X-Requested-With") === "XMLHttpRequest";

    if (req.method === "HEAD" || req.method === "OPTIONS") {
        return "none";
    } else if (accept?.includes("text/event-stream")
        || accept?.includes("application/octet-stream")
        || accept?.includes("multipart/form-data")
        || /(image|audio|video)\//.test(accept ?? "")
        || ["font", "image", "audio", "video", "object", "embed"].includes(fetchDest)
    ) {
        return "stream";
    } else if (accept?.includes("/json")
        || (acceptAll && (contentType?.includes("json") || xhr))
        || fetchDest === "manifest"
    ) {
        return "json";
    } else if (accept?.includes("/xml")
        || (acceptAll && contentType?.includes("xml"))
        || fetchDest === "xslt"
    ) {
        return "xml";
    } else if (accept?.includes("/html")
        || fetchDest === "document"
    ) {
        return "html";
    } else {
        const { pathname } = new URL(req.url);

        if (pathname === "/api" ||
            pathname.startsWith("/api/") ||
            /\.json?$/i.test(pathname)
        ) {
            return "json";
        } else if (/\.xml$/i.test(pathname)) {
            return "xml";
        } else if (/\.html?$/i.test(pathname)) {
            return "html";
        } else {
            return "text";
        }
    }
}
