import { serve, serveStatic } from "../http.ts";
import { startsWith } from "../path.ts";

const server = serve({
    async fetch(request, ctx) {
        const { pathname } = new URL(request.url);

        if (pathname === "/ws") {
            const { socket, response } = await ctx.upgradeWebSocket();

            socket.ready.then(() => {
                socket.send(`Hello, ${ctx.remoteAddress?.address}!`);

                socket.addEventListener("message", (event) => {
                    console.log(event.data);
                });
            });

            return response;
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
        } else if (startsWith(pathname, "/examples")) {
            return serveStatic(request, {
                fsDir: "./examples",
                urlPrefix: "/examples",
                listDir: true,
            });
        } else if (startsWith(pathname, "/esm")) {
            return serveStatic(request, {
                fsDir: "./esm",
                urlPrefix: "/esm",
                listDir: true,
            });
        }

        return new Response(`Hello, ${ctx.remoteAddress?.address}!`);
    },
});

export default server;

server.ready.then(() => {
    const { hostname, port } = server;
    const _hostname = hostname === "0.0.0.0" ? "localhost" : hostname;
    console.log(`Server listening on http://${_hostname}:${port}`);
});
