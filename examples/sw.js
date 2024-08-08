import { serve } from "../esm/http.js";

serve({
    /**
     * @param {Request} req 
     * @param {import("../types/http").RequestContext} ctx
     */
    fetch(req, ctx) {
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
            return fetch(req);
        }
    }
});
