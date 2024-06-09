/**
 * Utility functions for handling HTTP related tasks, such as parsing headers.
 * @module
 * @experimental
 */

import bytes from "../bytes.ts";
import { type FileInfo } from "../fs/types.ts";
import { sha256 } from "../hash/web.ts";

/**
 * Represents the HTTP request `Accept`, `Accept-Encoding` and `Accept-Language`
 * headers.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
 */
export interface Accept {
    type: string;
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
    type: string;
    charset?: string;
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
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    sameSite?: "Strict" | "Lax";
    httpOnly?: boolean;
    secure?: boolean;
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
                cookie.expires = new Date(value);
            } else if (key === "Max-Age") {
                cookie.maxAge = parseInt(value);
            } else if (key === "HttpOnly") {
                cookie.httpOnly = true;
            } else if (key === "Secure") {
                cookie.secure = true;
            } else if (key === "Path") {
                cookie.path = value;
            } else if (key === "SameSite") {
                cookie.sameSite = value as "Strict" | "Lax";
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
 * Represents the HTTP request `Range` header.
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
 */
export interface Range {
    unit: string;
    ranges: { start: number; end?: number; }[];
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
export async function etag(data: string | Uint8Array | FileInfo): Promise<string> {
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

    const mtime = data.mtime ?? new Date();
    const hash = await sha256(mtime.toISOString(), "base64");
    return `${data.size.toString(16)}-${hash.slice(0, 27)}`;
}

/**
 * Options for serving static files, used by {@link serveStatic}.
 */
export interface ServeStaticOptions {
    /**
     * The file system directory to serve files from. If not set, the current
     * working directory will be used.
     */
    fsDir?: string;
    /**
     * The prefix that will be stripped from the URL pathname.
     */
    urlPrefix?: string;
    /**
     * The default file to serve when the URL pathname is a directory, usually
     * "index.html". If not set, a 403 Forbidden response will be returned.
     */
    index?: string;
    /**
     * The maximum age in seconds for the "Cache-Control" header.
     */
    maxAge?: number;
    /**
     * Extra headers to be set in the response.
     */
    headers?: HeadersInit;
}
