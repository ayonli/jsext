import { args, parseArgs } from "../cli.ts";
import { serve, serveStatic } from "../http.ts";
import { importWasm } from "../module.ts";
import { startsWith } from "../path.ts";
import runtime, { addUnhandledRejectionListener } from "../runtime.ts";

const options = parseArgs(args);

addUnhandledRejectionListener(ev => {
    ev.preventDefault();
    console.log("reason", ev.reason);
    console.log("promise", ev.promise);
    console.log("\n");
});

serve({
    port: Number(options.port || 8000),
    async fetch(request, ctx) {
        console.log(new Date().toISOString(), request.method, request.url, ctx.remoteAddress?.address);
        const { pathname } = new URL(request.url);

        if (pathname === "/") {
            if (runtime().identity === "workerd") {
                return new Response("Hello, World!");
            } else {
                return serveStatic(request, {
                    fsDir: ".",
                    listDir: true,
                });
            }
        } else if (pathname === "/ws") {
            const { socket, response } = ctx.upgradeWebSocket();

            socket.addEventListener("open", () => {
                socket.send(`Hello, ${ctx.remoteAddress?.address}!`);
            });

            socket.addEventListener("message", (event) => {
                console.log(event.data);
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

            response.headers.set("Access-Control-Allow-Origin", "*");

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
        } else if (startsWith(pathname, "/bundle")) {
            return serveStatic(request, {
                fsDir: "./bundle",
                urlPrefix: "/bundle",
                listDir: true,
            });
        } else if (pathname === "/timestamp") {
            let module: string | WebAssembly.Module;

            if (["bun", "workerd"].includes(runtime().identity)) {
                // @ts-ignore
                module = (await import("./convert.wasm")).default;
            } else {
                module = new URL("./convert.wasm", import.meta.url).href;
            }

            const { timestamp } = await importWasm<{
                timestamp: () => number;
            }>(module, {
                Date: { now: Date.now },
            });

            return new Response(timestamp().toString());
        }

        return new Response("Not Found", { status: 404 });
    },
});
