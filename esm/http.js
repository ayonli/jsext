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
 * Creates a Node.js HTTP request listener using modern Web APIs.
 *
 * NOTE: This function requires Node.js v18.4.1 or above.
 *
 * @example
 * ```ts
 * import * as http from "node:http";
 * import { useWeb } from "@ayonli/jsext/http";
 *
 * const server = http.createServer(useWeb(async (req) => {
 *     return new Response("Hello, World!");
 * }));
 *
 * server.listen(8000);
 * ```
 */
function useWeb(listener) {
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

export { parseAccepts, parseContentType, parseCookie, stringifyCookie, useWeb };
//# sourceMappingURL=http.js.map
