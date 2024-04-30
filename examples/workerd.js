/**
 * An example for service-worker-like runtimes. To start the program, first make
 * sure the current working directory is the root path of this project, then run:
 * 
 * - Node.js: `node examples/workerd.js`
 * - Deno: `deno run -A examples/workerd.js`
 * - Bun: `bun run examples/workerd.js`
 * - Cloudflare Workers: `wrangler dev examples/workerd.js --port 8000  --compatibility-flags=nodejs_compat`
 * - WinterJS: `wasmer run wasmer/winterjs --net --mapdir=jsext:. -- --mode=cloudflare --port=8000 jsext/examples/workerd.js`
 * - Browser Devtools: `await (await import("./examples/workerd.js")).fetch()`
 * @module
 */

/// <reference types="../lib.deno.d.ts" />
import "../esm/augment.js";
import runtime from "../esm/runtime.js";
import { extname } from "../esm/path.js";
import { getMIME } from "../esm/filetype.js";
import { isBun, isDeno, isNode } from "../esm/env.js";
import { incomingMessageToRequest, pipeResponse } from "./node/util.js";
import { byteLength } from "../esm/string.js";

if (typeof navigator !== "undefined") {
    console.log("navigator.userAgent:", navigator.userAgent);
}

const _runtime = runtime();
console.log(_runtime);

const poweredBy = (({
    "node": "Node.js",
    "deno": "Deno",
    "bun": "Bun",
    "cloudflare-worker": "Cloudflare Workers",
    "chrome": "Chrome",
    "firefox": "Firefox",
    "safari": "Safari",
})[_runtime.identity] ?? "Unknown") + (_runtime.version ? "/" + _runtime.version : "");

const config = {
    /**
     * Only for Deno and Bun.
     */
    port: 8000,
    /**
     * 
     * @param {Request} req 
     * @param {object} info 
     * @param {any} ctx 
     * @returns 
     */
    async fetch(req, info, ctx) {
        console.log(req.method, req.url);
        console.log("Context:", ctx);

        if ("requestIP" in info) {
            console.log("Client address:", info.requestIP(req));
        } else if ("remoteAddr" in info) {
            console.log("Client address:", info.remoteAddr);
        } else {
            console.log("Env:", info);
        }

        if (["node", "deno", "bun"].includes(_runtime.identity)) {
            try {
                const { existsSync, statSync } = await import("node:fs");
                const { readFile } = await import("node:fs/promises");
                const ext = extname(req.url);
                const path = "." + new URL(req.url).pathname;

                if (!path.endsWith("/") && existsSync(path)) {
                    const stats = statSync(path);

                    if (stats.isDirectory()) {
                        return new Response(Uint8Array.from([]), {
                            status: 301,
                            statusText: "Moved Permanently",
                            headers: {
                                "Location": req.url + "/",
                                "Powered-By": poweredBy,
                            },
                        });
                    } else {
                        const file = await readFile(path);
                        return new Response(file.buffer, {
                            headers: {
                                "Content-Length": String(file.byteLength),
                                "Content-Type": getMIME(ext) + "; charset=utf-8",
                                "Powered-By": poweredBy,
                            },
                        });
                    }
                } else if (!ext && !path.endsWith("/") && existsSync(path + ".html")) {
                    const file = await readFile(path + ".html");
                    return new Response(file.buffer, {
                        headers: {
                            "Content-Length": String(file.byteLength),
                            "Content-Type": "text/html; charset=utf-8",
                            "Powered-By": poweredBy,
                        },
                    });
                } else if (!ext && path.endsWith("/") && existsSync(path + "index.html")) {
                    const file = await readFile(path + "index.html");
                    return new Response(file.buffer, {
                        headers: {
                            "Content-Length": String(file.byteLength),
                            "Content-Type": "text/html; charset=utf-8",
                            "Powered-By": poweredBy,
                        },
                    });
                } else {
                    return new Response("Not found", { status: 404 });
                }
            } catch {
                return new Response("Internal Server Error", { status: 500 });
            }
        }

        const { isEmoji } = await import(_runtime.tsSupport ? "../string.ts" : "../esm/string.js");
        const emoji = "😴😄⛔🎠🚓🚇";
        const text = "Hello, World!" + (isEmoji(emoji) ? " " + emoji : "");

        return new Response(text, {
            headers: {
                "Content-Length": String(byteLength(text)),
                "Content-Type": "text/plain; charset=utf-8",
                "Powered-By": poweredBy,
            },
        });
    }
};

export default config;

if (isBun) {
    console.log(`Listening on http://localhost:${config.port}/`);
} else if (isDeno) {
    Deno.serve({ port: config.port }, config.fetch);
} else if (isNode) {
    import("node:http").then(({ createServer }) => {
        createServer(async (nReq, nRes) => {
            const req = incomingMessageToRequest(nReq);
            const res = await config.fetch(req, {
                remoteAddr: nReq.socket.address(),
            });
            pipeResponse(res, nRes);
        }).listen(config.port, () => {
            console.log(`Listening on http://localhost:${config.port}/`);
        });
    });
}

/**
 * @param {string} url 
 */
export async function fetch(url) {
    const res = await config.fetch(new Request(url || location.href), {});
    return await res.text();
}
