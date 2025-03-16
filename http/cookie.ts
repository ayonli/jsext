import { capitalize } from "../string.ts";

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
        throw new SyntaxError("Invalid Set-Cookie header");
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
 * Sets a cookie in the `Cookie` header of the request or the `Set-Cookie` header
 * of the response.
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
export function setCookie(obj: Request | Response, cookie: Cookie): void;
/**
 * @deprecated Use the overload that accepts a {@link Response} object instead.
 */
export function setCookie(obj: Headers, cookie: Cookie): void;
export function setCookie(obj: Request | Response | Headers, cookie: Cookie): void {
    if (obj instanceof Headers) { // deprecated usage
        obj.append("Set-Cookie", stringifyCookie(cookie));
    } else if (obj instanceof Response) {
        obj.headers.append("Set-Cookie", stringifyCookie(cookie));
    } else {
        const cookies = getCookies(obj);
        const index = cookies.findIndex(({ name }) => name === cookie.name);

        if (index === -1) {
            cookies.push(cookie);
        } else {
            cookies[index] = cookie;
        }

        obj.headers.set("Cookie", stringifyCookies(cookies));
    }
}
