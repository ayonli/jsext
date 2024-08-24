/// <reference path="../lib.deno.d.ts" />
import runtime from "../esm/runtime.js";
import { EventEndpoint, EventSource } from "../esm/sse.js";

/**
 * @param {EventEndpoint} sse 
 */
const handle = (sse) => {
    setTimeout(async () => {
        await sse.send("Hello, World!", "1").catch(console.error);
        await sse.sendEvent("my-event", "Hi, World!", "2").catch(console.error);
        sse.dispatchEvent(new MessageEvent("another-event", {
            data: "Hi, A-yon!",
            lastEventId: "3",
        }));
    }, 100);
};

if (runtime().identity === "deno") {
    self.addEventListener("message", ({ data }) => {
        /**
         * @type {{ type: "server" | "client"; port: number  }}
         */
        const msg = data;

        if (msg.type === "server") {
            Deno.serve({ port: msg.port }, req => {
                const sse = new EventEndpoint(req);

                handle(sse);
                sse.response.headers.set("Access-Control-Allow-Origin", "*");

                return sse.response;
            });

            if (typeof self.postMessage === "function") {
                self.postMessage("ready");
            }
        } else if (msg.type === "client") {
            const es = new EventSource("http://localhost:" + msg.port);
            es.addEventListener("ping", e => {
                console.log(e.data);
            });
            es.addEventListener("open", () => {
                self.postMessage("ready");
            });
        }
    });
} else if (runtime().identity === "bun") {
    self.addEventListener("message", ({ data }) => {
        /**
         * @type {{ type: "server" | "client"; port: number  }}
         */
        const msg = data;

        if (msg.type === "server") {
            Bun.serve({
                port: msg.port,
                /**
                 * @param {Request} req 
                 */
                fetch(req) {
                    const sse = new EventEndpoint(req);

                    handle(sse);
                    sse.response.headers.set("Access-Control-Allow-Origin", "*");

                    return sse.response;
                }
            });

            if (typeof self.postMessage === "function") {
                self.postMessage("ready");
            }
        } else if (msg.type === "client") {
            const es = new EventSource("http://localhost:" + msg.port);
            es.addEventListener("ping", e => {
                console.log(e.data);
            });
            es.addEventListener("open", () => {
                self.postMessage("ready");
            });
        }
    });
} else if (runtime().identity === "node") {
    import("node:worker_threads").then(async ({ parentPort, isMainThread }) => {
        if (isMainThread)
            return;

        parentPort.on("message", async (data) => {
            /**
             * @type {{ type: "server" | "client"; port: number  }}
             */
            const msg = data;

            if (msg.type === "server") {
                const { createServer } = await import("node:http");

                createServer((req, res) => {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    const sse = new EventEndpoint(req, res);

                    handle(sse);
                }).listen(msg.port, () => {
                    parentPort.postMessage("ready");
                });
            } else if (msg.type === "client") {
                const es = new EventSource("http://localhost:" + msg.port);
                es.addEventListener("ping", e => {
                    console.log(e.data);
                });
                es.addEventListener("open", () => {
                    parentPort.postMessage("ready");
                });
            }
        });
    });
}
