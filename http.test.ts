import { deepStrictEqual, strictEqual } from "node:assert";
import * as http from "node:http";
import { useWeb } from "./http.ts";
import func from "./func.ts";

describe("http", () => {
    if (typeof fetch !== "function" || typeof Request !== "function" || typeof Response !== "function") {
        return;
    }

    describe("useWeb", () => {
        it("with http module", func(async (defer) => {
            const server = http.createServer(useWeb(async (req) => {
                return new Response(JSON.stringify({
                    method: req.method,
                    url: req.url,
                    headers: [...req.headers.entries()].reduce((acc, [key, value]) => {
                        acc[key.toLowerCase()] = value;
                        return acc;
                    }, {} as Record<string, string>),
                    body: await req.json(),
                }), {
                    status: 200,
                    statusText: "OK",
                });
            }));
            server.listen(8001);
            defer(() => server.close());

            const res = await fetch(`http://localhost:8001/hello`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ hello: "world" }),
            });
            const data = await res.json();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(data.method, "POST");
            strictEqual(data.url, "http://localhost:8001/hello");
            strictEqual(data.headers["content-type"], "application/json");
            deepStrictEqual(data.body, { hello: "world" });
        }));

        it("with Hono framework", func(async (defer) => {
            const { Hono } = await import("hono");

            const app = new Hono()
                .post("/hello", async (ctx) => {
                    const body = await ctx.req.json();
                    const req = ctx.req.raw;
                    return ctx.json({
                        method: req.method,
                        url: req.url,
                        headers: [...req.headers.entries()].reduce((acc, [key, value]) => {
                            acc[key.toLowerCase()] = value;
                            return acc;
                        }, {} as Record<string, string>),
                        body: body,
                    });
                });

            const server = http.createServer(useWeb(app.fetch));
            server.listen(8002);
            defer(() => server.close());

            const res = await fetch(`http://localhost:8002/hello`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ hello: "world" }),
            });
            const data = await res.json();

            strictEqual(res.status, 200);
            // strictEqual(res.statusText, "OK");
            strictEqual(data.method, "POST");
            strictEqual(data.url, "http://localhost:8002/hello");
            strictEqual(data.headers["content-type"], "application/json");
            deepStrictEqual(data.body, { hello: "world" });
        }));
    });
});
