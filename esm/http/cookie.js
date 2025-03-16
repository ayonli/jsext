import { capitalize } from '../string.js';

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
function parseCookie(str) {
    const [nameValue, ...params] = str.split(";").map((part) => part.trim());
    if (!nameValue || !nameValue.includes("=")) {
        throw new SyntaxError("Invalid Set-Cookie header");
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
                cookie.expires = new Date(value).valueOf();
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
                cookie.path = value || "/";
            }
            else if (key === "SameSite" && value) {
                cookie.sameSite = value.toLowerCase();
            }
            else if (key === "Partitioned") {
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
function stringifyCookie(cookie) {
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
function parseCookies(str) {
    return !str ? [] : str.split(/;\s*/g).reduce((cookies, part) => {
        const [name, value] = part.split("=");
        if (name && value !== undefined) {
            cookies.push({ name, value });
        }
        return cookies;
    }, []);
}
/**
 * Converts a list of cookies to a string that can be used in the `Cookie`
 * header.
 */
function stringifyCookies(cookies) {
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
function getCookies(obj) {
    var _a;
    if ("ok" in obj && "status" in obj) {
        return obj.headers.getSetCookie().map(str => parseCookie(str));
    }
    else {
        return parseCookies((_a = obj.headers.get("Cookie")) !== null && _a !== void 0 ? _a : "");
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
function getCookie(obj, name) {
    var _a;
    return (_a = getCookies(obj).find(cookie => cookie.name === name)) !== null && _a !== void 0 ? _a : null;
}
function setCookie(obj, cookie) {
    if (obj instanceof Headers) { // deprecated usage
        obj.append("Set-Cookie", stringifyCookie(cookie));
    }
    else if (obj instanceof Response) {
        obj.headers.append("Set-Cookie", stringifyCookie(cookie));
    }
    else {
        const cookies = getCookies(obj);
        const index = cookies.findIndex(({ name }) => name === cookie.name);
        if (index === -1) {
            cookies.push(cookie);
        }
        else {
            cookies[index] = cookie;
        }
        obj.headers.set("Cookie", stringifyCookies(cookies));
    }
}

export { getCookie, getCookies, parseCookie, parseCookies, setCookie, stringifyCookie, stringifyCookies };
//# sourceMappingURL=cookie.js.map
