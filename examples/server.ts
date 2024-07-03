import { readFileAsText } from "../fs.ts";
import { ServeOptions } from "../http.ts";

export default {
    hostname: "localhost",
    port: 4000,
    key: (await readFileAsText("./examples/certs/cert.key")),
    cert: (await readFileAsText("./examples/certs/cert.pem")),
    async fetch(request, ctx) {
        console.log(request);
        console.log(ctx.remoteAddr);
        const { pathname } = new URL(request.url);

        if (pathname === "/ws") {
            const { socket, response } = await ctx.upgrade(request);

            socket.ready.then(() => {
                socket.addEventListener("message", (event) => {
                    console.log(event.data);
                });
            });

            return response;
        }

        return new Response("Hello, World!");
    },
} as ServeOptions;
