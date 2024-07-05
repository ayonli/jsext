import { serve } from "../http.ts";

export default serve({
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
        }

        return new Response(`Hello, ${ctx.remoteAddress?.address}!`);
    },
});
