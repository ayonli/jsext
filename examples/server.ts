import bytes from "../bytes/index.ts";
import { args, parseArgs } from "../cli/index.ts";
import { parseResponse, serve, serveStatic } from "@jsext/http";
import { importWasm } from "../module/index.ts";
import { connect } from "../net/index.ts";
import { startsWith } from "../path/index.ts";
import { readAsText } from "../reader/index.ts";
import runtime, { addUnhandledRejectionListener } from "../runtime/index.ts";

const options = parseArgs(args);

addUnhandledRejectionListener(ev => {
    ev.preventDefault();
    console.log("reason", ev.reason);
    console.log("promise", ev.promise);
    console.log("\n");
});

export default serve({
    // type: "module",
    port: Number(options.port || 8000),
    async fetch(request, ctx) {
        // console.log(new Date().toISOString(), request.method, request.url, ctx.remoteAddress?.address);
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
            const { endpoint, response } = ctx.upgradeEventEndpoint();
            let count = endpoint.lastEventId ? Number(endpoint.lastEventId) : 0;

            setInterval(() => {
                const lastEventId = String(++count);
                endpoint.dispatchEvent(new MessageEvent("ping", {
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
        } else if (pathname === "/connect") {
            const socket = await connect({ hostname: "example.com", port: 443, tls: true });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));
            await writer.close();

            const result = await readAsText(socket.readable);

            return parseResponse(result);
        } else if (pathname === "/health") {
            return new Response("OK");
        }

        return new Response("Not Found", { status: 404 });
    },
});
