/**
 * Utility functions for handling HTTP related tasks, such as parsing headers.
 * @module
 * @experimental
 */

import bytes, { text } from "../bytes.ts";
import { capitalize } from "../string.ts";

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
    return str.split(/;\s*/g).reduce((cookies, part) => {
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
        tag.startsWith("W/") ? tag.slice(2) : tag
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
        headers: {
            "WWW-Authenticate": `Basic realm="${host}"`,
        },
    });
}
