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
import runtime from "../esm/runtime.js";
import { isBun, isDeno, isNode } from "../esm/env.js";
import { serve } from "../esm/workerd/http.js";
import { startsWith } from "../esm/path.js";
import deprecate from "../esm/deprecate.js";

const sum = deprecate(function sum(a, b) {
    return a + b;
}, "use `a + b` instead");
console.assert(sum(1, 2) === 3);

function pow(a, b) {
    deprecate("pow()", pow, "use `a ** b` instead");
    return a ** b;
}

console.assert(pow(2, 3) === 8);

if (typeof navigator !== "undefined") {
    console.log("navigator.userAgent:", navigator.userAgent);
}

const _runtime = runtime();
console.log(_runtime);

const config = serve({
    port: 8000,
    /**
     * 
     * @param {Request} req 
     * @param {object} info 
     * @param {any} ctx 
     * @returns 
     */
    async fetch(request, ctx) {
        const { pathname } = new URL(request.url);

        if (pathname === "/sse") {
            const { events, response } = ctx.createEventEndpoint();
            let count = events.lastEventId ? Number(events.lastEventId) : 0;

            setInterval(() => {
                const lastEventId = String(++count);
                events.dispatchEvent(new MessageEvent("ping", {
                    data: lastEventId,
                    // @ts-ignore
                    lastEventId,
                }));
            }, 5_000);

            return response;
        } else if (pathname === "/ws") {
            const { socket, response } = await ctx.upgradeWebSocket();

            socket.ready.then(() => {
                socket.send(`Hello, ${ctx.remoteAddress?.address}!`);

                socket.addEventListener("message", (event) => {
                    console.log(event.data);
                });
            });

            return response;
        }

        return new Response(`Hello, ${ctx.remoteAddress?.address}!`);
    }
});

export default config;

if (isBun || isDeno || isNode) {
    const server = serve({
        port: config.port,
        fetch: config.fetch,
    });

    server.ready.then(() => {
        console.log(`Listening on http://localhost:${config.port}/`);
    });
}

/**
 * @param {string} url 
 */
export async function fetch(url) {
    const res = await config.fetch(new Request(url || location.href), {});
    return await res.text();
}
