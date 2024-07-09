/**
 * To start, run:
 * 
 * ```sh
 * wasmer run wasmer/winterjs --net --mapdir=jsext:. -- jsext/examples/winterjs/main.js
 * ````
 * @module
 */

import { serve } from "../../esm/workerd/http.js";

serve({
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
        }

        return new Response(`Hello, ${ctx.remoteAddress?.address}!`);
    }
});
