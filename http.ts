/**
 * Functions to transform Node.js HTTP APIs to modern Web standards.
 * 
 * NOTE: This module requires Node.js version v18.3 or higher.
 * @module
 */

/**
 * Transforms a Node.js HTTP request to a modern `Request` object.
 */
function toWebRequest(req: import("http").IncomingMessage): Request {
    const protocol = (req.socket as any)["encrypted"] ? "https" : "http";
    const url = new URL(req.url ?? "/", `${protocol}://${req.headers.host}`);
    const headers = new Headers(req.headers as Record<string, string>);
    const init: RequestInit = {
        method: req.method!,
        headers,
    };
    const cache = headers.get("Cache-Control");
    const mode = headers.get("Sec-Fetch-Mode");
    const referrer = headers.get("Referer");

    if (cache === "no-cache") {
        init.cache = "no-cache";
    } else if (cache === "no-store") {
        init.cache = "no-store";
    } else if (cache === "only-if-cached" && mode === "same-origin") {
        init.cache = "only-if-cached";
    } else {
        init.cache = "default";
    }

    if (mode === "no-cors") {
        init.mode = "no-cors";
    } else if (mode === "same-origin") {
        init.mode = "same-origin";
    } else {
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
function toNodeResponse(res: Response, nodeRes: import("http").ServerResponse): void {
    const { status, statusText, headers } = res;

    nodeRes.writeHead(status, statusText, Object.fromEntries(headers.entries()));

    if (!res.body) {
        nodeRes.end();
    } else {
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
 * Creates a Node.js HTTP request listener using modern Web APIs.
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
export function useWeb(
    listener: (req: Request) => void | Response | Promise<void | Response>
): import("http").RequestListener {
    return async (nReq, nRes) => {
        const req = toWebRequest(nReq);
        const res = await listener(req);

        if (res && !nRes.headersSent &&
            Reflect.get(nReq, Symbol.for("upgraded")) !== true // Skip if the request is upgraded
        ) {
            toNodeResponse(res, nRes);
        }
    };
}
