/**
 * An example for service-worker-like runtimes. To start the program, first make
 * sure the current working directory is the root path of this project, then run:
 * 
 * - Deno: `deno run -A examples/workerd.js`
 * - Bun: `bun run examples/workerd.js`
 * - Cloudflare Workers: `wrangler dev examples/workerd.js --port 5000`
 * - WinterJS: `wasmer run wasmer/winterjs --net --mapdir=jsext:. -- --mode=cloudflare --port=5000 jsext/examples/workerd.js`
 * @module
 */

/// <reference types="../lib.deno.d.ts" />
import "../esm/augment.js";
import runtime from "../esm/runtime.js";

if (typeof navigator !== "undefined") {
    console.log("navigator.userAgent:", navigator.userAgent);
}

const _runtime = runtime();
console.log(_runtime);

const config = {
    /**
     * Only for Deno and Bun.
     */
    port: 5000,
    /**
     * 
     * @param {Request} req 
     * @param {object} info 
     * @param {any} ctx 
     * @returns 
     */
    async fetch(req, info, ctx) {
        console.log(req.url, ctx);

        if ("requestIP" in info) {
            console.log(info.requestIP(req));
        } else if ("remoteAddr" in info) {
            console.log(info.remoteAddr);
        } else {
            console.log(info);
        }

        const { isEmoji } = await import(_runtime.tsSupport ? "../string.ts" : "../esm/string.js");
        console.log("isEmoji", isEmoji("😴😄⛔🎠🚓🚇"));

        return new Response("Hello, World!");
    }
};

export default config;

if (typeof Deno === "object" && typeof Deno.serve === "function") {
    Deno.serve({ port: config.port }, config.fetch);
}
