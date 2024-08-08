import { serve } from "../esm/http.js";
import _try from "../esm/try.js";

serve({
    /**
     * @param {Request} req 
     * @param {import("../types/http").RequestContext} ctx
     */
    async fetch(req, ctx) {
        const { pathname } = new URL(req.url);

        if (pathname === "/hello") {
            return new Response("Hello, World!");
        } else if (pathname === "/sse") {
            const { events, response } = ctx.createEventEndpoint();
            let count = events.lastEventId ? Number(events.lastEventId) : 0;

            setInterval(() => {
                const lastEventId = String(++count);
                events.dispatchEvent(new MessageEvent("ping", {
                    data: lastEventId,
                    lastEventId,
                }));
            }, 5_000);

            return response;
        } else {
            const [err, res] = await _try(fetch(req));

            if (err) {
                const cache = await caches.match(req);

                if (cache) {
                    return cache;
                } else {
                    return new Response("Service Unavailable", { status: 503 });
                }
            } else if (!res.ok) {
                const cache = await caches.match(req);

                if (cache) {
                    return cache;
                } else {
                    return res;
                }
            } else {
                const cache = await caches.open("v1");
                ctx.waitUntil(cache.put(req, res.clone()));

                return res;
            }
        }
    }
});
