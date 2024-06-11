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
        throw new TypeError("Invalid Authorization header");
    }
    else if (scheme !== "basic") {
        throw new TypeError("Authorization scheme is not 'Basic'");
    }
    else {
        const [username, password] = atob(credentials).split(":");
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
        headers: {
            "WWW-Authenticate": `Basic realm="${host}"`,
        },
    });
}

export { ifMatch, ifNoneMatch, parseAccepts, parseBasicAuth, parseContentType, parseCookie, parseRange, stringifyCookie, verifyBasicAuth };
//# sourceMappingURL=util.js.map
