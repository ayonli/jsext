import { deepStrictEqual, ok, strictEqual } from "node:assert";
import * as http from "node:http";
import {
    BasicAuthorization,
    etag,
    ifMatch,
    ifNoneMatch,
    parseAccepts,
    parseBasicAuth,
    parseContentType,
    parseCookie,
    parseRange,
    randomPort,
    serveStatic,
    stringifyCookie,
    verifyBasicAuth,
    withWeb,
} from "./http.ts";
import func from "./func.ts";
import { readFileAsText } from "./fs.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import { sleep } from "./async.ts";
import { readAsJSON } from "./reader.ts";

declare const Bun: any;

describe("http", () => {
    describe("parseAccepts", () => {
        it("parse accept header", () => {
            const accept = parseAccepts("text/html,application/xhtml+xml;q=0.9");
            deepStrictEqual(accept, [
                { type: "text/html", weight: 1 },
                { type: "application/xhtml+xml", weight: 0.9 },
            ]);

            const accept2 = parseAccepts("text/html;q=0.5,application/xhtml+xml;q=0.9");
            deepStrictEqual(accept2, [
                { type: "application/xhtml+xml", weight: 0.9 },
                { type: "text/html", weight: 0.5 },
            ]);

            const accept3 = parseAccepts("text/html,application/xhtml+xml");
            deepStrictEqual(accept3, [
                { type: "text/html", weight: 1 },
                { type: "application/xhtml+xml", weight: 1 },
            ]);
        });

        it("parse accept-encoding header", () => {
            const accept = parseAccepts("gzip, deflate, br");
            deepStrictEqual(accept, [
                { type: "gzip", weight: 1 },
                { type: "deflate", weight: 1 },
                { type: "br", weight: 1 },
            ]);

            const accept2 = parseAccepts("gzip;q=0.8, deflate;q=0.6, br;q=0.4");
            deepStrictEqual(accept2, [
                { type: "gzip", weight: 0.8 },
                { type: "deflate", weight: 0.6 },
                { type: "br", weight: 0.4 },
            ]);
        });

        it("parse accept-language header", () => {
            const accept = parseAccepts("en-US,en;q=0.9,es;q=0.8");
            deepStrictEqual(accept, [
                { type: "en-US", weight: 1 },
                { type: "en", weight: 0.9 },
                { type: "es", weight: 0.8 },
            ]);

            const accept2 = parseAccepts("en-US,en;q=0.9,es;q=0.8");
            deepStrictEqual(accept2, [
                { type: "en-US", weight: 1 },
                { type: "en", weight: 0.9 },
                { type: "es", weight: 0.8 },
            ]);
        });
    });

    it("parseContentType", () => {
        const type = parseContentType("text/html");
        deepStrictEqual(type, { type: "text/html" });

        const type2 = parseContentType("text/html; charset=utf-8");
        deepStrictEqual(type2, { type: "text/html", charset: "utf-8" });

        const type3 = parseContentType("multipart/form-data;boundary=----WebKitFormBoundaryzjK4sVZ2QeZvz5zB");
        deepStrictEqual(type3, {
            type: "multipart/form-data",
            boundary: "----WebKitFormBoundaryzjK4sVZ2QeZvz5zB",
        });
    });

    it("parseCookie", () => {
        const cookies = parseCookie("foo=bar");
        deepStrictEqual(cookies, {
            name: "foo",
            value: "bar",
        });

        const cookies2 = parseCookie("foo=bar; Domain=example.com");
        deepStrictEqual(cookies2, {
            name: "foo",
            value: "bar",
            domain: "example.com",
        });

        const cookies3 = parseCookie("foo=bar; Domain=example.com; Secure");
        deepStrictEqual(cookies3, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
        });

        const cookies4 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly");
        deepStrictEqual(cookies4, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
        });

        const cookies5 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Strict");
        deepStrictEqual(cookies5, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Strict",
        });

        const cookies6 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax");
        deepStrictEqual(cookies6, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
        });

        const cookies7 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/");
        deepStrictEqual(cookies7, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
        });

        const cookies8 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT");
        deepStrictEqual(cookies8, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT"),
        });

        const cookies9 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600");
        deepStrictEqual(cookies9, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
            maxAge: 3600,
        });

        const cookies10 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600; Expires=Wed, 09 Jun 2021 10:18:14 GMT");
        deepStrictEqual(cookies10, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
            maxAge: 3600,
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT"),
        });
    });

    it("stringifyCookie", () => {
        const cookie = stringifyCookie({
            name: "foo",
            value: "bar",
        });
        strictEqual(cookie, "foo=bar");

        const cookie2 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
        });
        strictEqual(cookie2, "foo=bar; Domain=example.com");

        const cookie3 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
        });
        strictEqual(cookie3, "foo=bar; Domain=example.com; Secure");

        const cookie4 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
        });
        strictEqual(cookie4, "foo=bar; Domain=example.com; HttpOnly; Secure");

        const cookie5 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Strict",
        });
        strictEqual(cookie5, "foo=bar; Domain=example.com; HttpOnly; Secure; SameSite=Strict");

        const cookie6 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
        });
        strictEqual(cookie6, "foo=bar; Domain=example.com; HttpOnly; Secure; SameSite=Lax");

        const cookie7 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
        });
        strictEqual(cookie7, "foo=bar; Domain=example.com; Path=/; HttpOnly; Secure; SameSite=Lax");

        const cookie8 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT"),
        });
        strictEqual(cookie8, "foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; HttpOnly; Secure; SameSite=Lax");

        const cookie9 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
            maxAge: 3600,
        });
        strictEqual(cookie9, "foo=bar; Domain=example.com; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax");

        const cookie10 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
            path: "/",
            maxAge: 3600,
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT"),
        });
        strictEqual(cookie10, "foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; Max-Age=3600; HttpOnly; Secure; SameSite=Lax");
    });

    it("parseRange", () => {
        const range = parseRange("bytes=0-499");
        deepStrictEqual(range, {
            unit: "bytes",
            ranges: [{ start: 0, end: 499 }],
        });

        const range2 = parseRange("bytes=0-499,600-999");
        deepStrictEqual(range2, {
            unit: "bytes",
            ranges: [{ start: 0, end: 499 }, { start: 600, end: 999 }],
        });

        const range3 = parseRange("bytes=0-499, 600-999, 1000-1499");
        deepStrictEqual(range3, {
            unit: "bytes",
            ranges: [
                { start: 0, end: 499 },
                { start: 600, end: 999 },
                { start: 1000, end: 1499 }
            ],
        });

        const range4 = parseRange("bytes=0-499, 600-999, 1000-1499, -500");
        deepStrictEqual(range4, {
            unit: "bytes",
            ranges: [
                { start: 0, end: 499 },
                { start: 600, end: 999 },
                { start: 1000, end: 1499 },
            ],
            suffix: 500,
        });
    });

    it("ifMatch", async () => {
        const _etag = await etag("Hello, World!");
        const match = ifMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3YH", _etag);
        strictEqual(match, true);

        const match2 = ifMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3Yh", _etag);
        strictEqual(match2, false);

        const match3 = ifMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3Yh,d-3/1gIbsr1bCvZ2KQgJ7DpTGR3YH", _etag);
        strictEqual(match3, true);
    });

    it("ifNoneMatch", async () => {
        const _etag = await etag("Hello, World!");
        const match = ifNoneMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3YH", _etag);
        strictEqual(match, false);

        const match2 = ifNoneMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3Yh", _etag);
        strictEqual(match2, true);

        const match3 = ifNoneMatch("d-3/1gIbsr1bCvZ2KQgJ7DpTGR3Yh,d-3/1gIbsr1bCvZ2KQgJ7DpTGR3YH", _etag);
        strictEqual(match3, false);
    });

    it("parseBasicAuth", async () => {
        const auth = parseBasicAuth("Basic cm9vdDpwYSQkdzByZA==");
        deepStrictEqual(auth, { username: "root", password: "pa$$w0rd" });
    });

    it("verifyBasicAuth", async function () {
        if (typeof Request === "undefined") {
            this.skip();
        }

        const users = new Map([
            ["root", "pa$$w0rd"]
        ]);
        const verify = async (auth: BasicAuthorization) => {
            const password = users.get(auth.username);
            return !!password && password === auth.password;
        };

        const req = new Request("http://localhost", {
            headers: {
                "Authorization": "Basic cm9vdDpwYSQkdzByZA==",
            },
        });
        const res = await verifyBasicAuth(req, verify);
        strictEqual(res, undefined);

        const req2 = new Request("http://localhost", {
            headers: {
                "Authorization": "Basic CM9vdDpwYSQkdzByZA==",
            },
        });
        const res2 = await verifyBasicAuth(req2, verify);
        strictEqual(res2?.status, 401);
        strictEqual(res2?.headers.get("WWW-Authenticate"), `Basic realm=\"localhost\"`);

        const req3 = new Request("http://localhost");
        const res3 = await verifyBasicAuth(req3, verify);
        strictEqual(res3?.status, 401);
        strictEqual(res3?.headers.get("WWW-Authenticate"), `Basic realm=\"localhost\"`);
    });

    it("etag", async () => {
        const _etag = await etag("Hello, World!");
        strictEqual(_etag, "d-3/1gIbsr1bCvZ2KQgJ7DpTGR3YH");

        const _etag2 = await etag("");
        strictEqual(_etag2, "0-47DEQpj8HBSa+/TImW+5JCeuQeR");
    });

    describe("randomPort", () => {
        it("random port", func(async (defer) => {
            const port = await randomPort();
            ok(port > 0 && port <= 65535);

            if (typeof fetch !== "function") {
                return;
            }

            if (isDeno) {
                const server = Deno.serve({ port }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async () => {
                        return new Response("Hello, World!");
                    },
                });
                defer(() => server.stop(true));
            } else {
                const server = http.createServer(withWeb(async () => {
                    return new Response("Hello, World!");
                })).listen(port);
                defer(() => server.close());
            }

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, "Hello, World!");
        }));

        it("prefer port", func(async (defer) => {
            const port = await randomPort(32145);
            strictEqual(port, 32145);

            if (typeof fetch !== "function") {
                return;
            }

            if (isDeno) {
                const server = Deno.serve({ port }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async () => {
                        return new Response("Hello, World!");
                    },
                });
                defer(() => server.stop(true));
            } else {
                const server = http.createServer(withWeb(async () => {
                    return new Response("Hello, World!");
                })).listen(port);
                defer(() => server.close());
            }

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, "Hello, World!");
        }));

        it("prefer port used", func(async (defer) => {
            const server = http.createServer(() => { });
            await new Promise<void>((resolve) => server.listen(32146, () => resolve()));
            defer(() => server.close());

            const port = await randomPort(32146);
            ok(port > 0 && port <= 65535 && port !== 32146);

            if (typeof fetch !== "function") {
                return;
            }

            if (isDeno) {
                const server = Deno.serve({ port }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async () => {
                        return new Response("Hello, World!");
                    },
                });
                defer(() => server.stop(true));
            } else {
                const server = http.createServer(withWeb(async () => {
                    return new Response("Hello, World!");
                })).listen(port);
                defer(() => server.close());
            }

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, "Hello, World!");
        }));
    });

    describe("withWeb", () => {
        if (typeof fetch !== "function" ||
            typeof Request !== "function" ||
            typeof Response !== "function"
        ) {
            return;
        }

        it("with http module", func(async (defer) => {
            const server = http.createServer(withWeb(async (req) => {
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
            const port = await randomPort();
            server.listen(port);
            defer(() => server.close());

            const res = await fetch(`http://localhost:${port}/hello`, {
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
            strictEqual(data.url, `http://localhost:${port}/hello`);
            strictEqual(data.headers["content-type"], "application/json");
            deepStrictEqual(data.body, { hello: "world" });
        }));

        it("with https module", func(async function (defer) {
            if (!isNode) {
                this.skip();
            }

            const https = await import("node:https");
            const server = https.createServer({
                key: await readFileAsText("./examples/certs/key.pem"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
                passphrase: "alartest",
            }, withWeb(async (req) => {
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
            const port = await randomPort();
            server.listen(port);
            defer(() => server.close());

            const res = await new Promise<{
                url: string;
                status: number;
                statusText: string;
                headers: Record<string, string>;
                body?: any;
            }>(async (resolve, reject) => {
                const req = https.request({
                    key: await readFileAsText("./examples/certs/key.pem"),
                    cert: await readFileAsText("./examples/certs/cert.pem"),
                    ca: [await readFileAsText("./examples/certs/cert.pem")],
                    passphrase: "alartest",
                    method: "POST",
                    host: "localhost",
                    port,
                    path: "/hello",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }, async (res) => {
                    try {
                        const json = await readAsJSON(res);
                        resolve({
                            url: res.url!,
                            status: res.statusCode!,
                            statusText: res.statusMessage!,
                            headers: res.headers as Record<string, string>,
                            body: json
                        });
                    } catch (error) {
                        reject(error);
                    }
                });

                req.write(JSON.stringify({ hello: "world" }));
                req.end();
            });

            const data = res.body;
            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(data.method, "POST");
            strictEqual(data.url, `https://localhost:${port}/hello`);
            strictEqual(data.headers["content-type"], "application/json");
            deepStrictEqual(data.body, { hello: "world" });
        }));

        it("with http2 module", func(async function (defer) {
            if (!isNode) {
                this.skip();
            }

            const http2 = await import("node:http2");
            const server = http2.createSecureServer({
                key: await readFileAsText("./examples/certs/key.pem"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
                passphrase: "alartest",
            }, withWeb(async (req) => {
                return new Response(JSON.stringify({
                    method: req.method,
                    url: req.url,
                    headers: [...req.headers.entries()].reduce((acc, [key, value]) => {
                        acc[key.toLowerCase()] = value;
                        return acc;
                    }, {} as Record<string, string>),
                    body: req.body ? await req.json() : null,
                }), {
                    status: 200,
                    statusText: "OK",
                });
            }));
            const port = await randomPort();
            server.listen(port);
            defer(() => server.close());

            const client = http2.connect(`https://localhost:${port}`, {
                key: await readFileAsText("./examples/certs/key.pem"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
                ca: [await readFileAsText("./examples/certs/cert.pem")],
                passphrase: "alartest",
            });
            defer(() => client.close());

            const res = await new Promise<{
                url: string;
                status: number;
                statusText: string;
                headers: Record<string, string>;
                body?: any;
            }>(async (resolve, reject) => {
                const req = client.request({
                    ":method": "POST",
                    ":path": "/hello",
                    "Content-Type": "application/json",
                }, {
                    endStream: false,
                });

                req.once("response", async (headers) => {
                    try {
                        const json = await readAsJSON(req);
                        resolve({
                            url: `https://localhost:${port}/hello`,
                            status: headers[":status"]!,
                            statusText: "",
                            headers: Object.fromEntries(Object.entries(headers).filter(([key]) => {
                                return key.startsWith(":") === false;
                            })) as Record<string, string>,
                            body: json
                        });
                    } catch (error) {
                        reject(error);
                    }
                });

                req.write(JSON.stringify({ hello: "world" }));
                req.end();
            });

            const data = res.body;
            strictEqual(res.status, 200);
            strictEqual(res.statusText, "");
            strictEqual(data.method, "POST");
            strictEqual(data.url, `https://localhost:${port}/hello`);
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

            const server = http.createServer(withWeb(app.fetch));
            const port = await randomPort();
            server.listen(port);
            defer(() => server.close());

            const res = await fetch(`http://localhost:${port}/hello`, {
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
            strictEqual(data.url, `http://localhost:${port}/hello`);
            strictEqual(data.headers["content-type"], "application/json");
            deepStrictEqual(data.body, { hello: "world" });
        }));

        it("in Deno", func(async function (defer) {
            if (!isDeno) {
                this.skip();
            }

            const server = http.createServer(withWeb(async (req) => {
                if (req.url.endsWith("/")) {
                    return Response.redirect(req.url.slice(0, -1), 301);
                } else {
                    return new Response("Hello, World!");
                }
            }));
            const port = await randomPort();
            server.listen(port);
            defer(() => server.close());

            const res = await fetch(`http://localhost:${port}/hello/`, { redirect: "manual" });

            strictEqual(res.status, 301);
            strictEqual(res.headers.get("Location"), `http://localhost:${port}/hello`);
        }));
    });

    describe("serveStatic", () => {
        if (typeof fetch !== "function" ||
            typeof Request !== "function" ||
            typeof Response !== "function"
        ) {
            return;
        }

        it("default", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                // @ts-ignore
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req);
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req);
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/examples/index.html`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, content);

            const res1 = await fetch(`http://localhost:${port}/examples`, { redirect: "manual" });

            strictEqual(res1.status, 301);
            strictEqual(res1.headers.get("Location"), `http://localhost:${port}/examples/`);

            const res2 = await fetch(res1.headers.get("Location")!);
            const text2 = await res2.text();

            strictEqual(res2.status, 200);
            strictEqual(res2.statusText, "OK");
            strictEqual(text2, content);
        }));

        it("with fsDir", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return await serveStatic(req, {
                        fsDir: "./examples",
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/index.html`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, content);
        }));

        it("with urlPrefix", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/assets/index.html`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, content);
        }));

        it("with maxAge", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/assets/`, { redirect: "manual" });
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(res.headers.get("Cache-Control"), "public, max-age=3600");
            strictEqual(text, content);
        }));

        it("with If-Modified-Since", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/assets/index.html`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, content);

            const lastModified = res.headers.get("Last-Modified");
            ok(lastModified !== null);

            const res2 = await fetch(res.url, {
                headers: {
                    "If-Modified-Since": lastModified as string,
                },
            });

            strictEqual(res2.status, 304);
        }));

        it("with If-None-Match", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                // @ts-ignore
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/assets/index.html`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, content);

            const etag = res.headers.get("Etag");
            ok(etag !== null);

            const res2 = await fetch(res.url, {
                headers: {
                    "If-None-Match": etag as string,
                },
            });

            strictEqual(res2.status, 304);
        }));

        it("with Range", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/assets/index.html`, {
                headers: {
                    "Range": "bytes=0-499",
                }
            });
            const text = await res.text();

            strictEqual(res.status, 206);
            strictEqual(text, content.slice(0, 500));
            strictEqual(res.headers.get("Content-Range"), `bytes 0-499/${content.length}`);

            const res2 = await fetch(res.url, {
                headers: {
                    "Range": "bytes=500-999",
                }
            });
            const text2 = await res2.text();

            strictEqual(res2.status, 206);
            strictEqual(text2, content.slice(500, 1000));
            strictEqual(res2.headers.get("Content-Range"), `bytes 500-999/${content.length}`);

            const res3 = await fetch(res.url, {
                headers: {
                    "Range": "bytes=1000-",
                }
            });
            const text3 = await res3.text();

            strictEqual(res3.status, 206);
            strictEqual(text3, content.slice(1000));
            strictEqual(res3.headers.get("Content-Range"), `bytes 1000-${content.length - 1}/${content.length}`);

            const res4 = await fetch(res.url, {
                headers: {
                    "Range": "bytes=-500",
                }
            });
            const text4 = await res4.text();

            strictEqual(res4.status, 206);
            strictEqual(text4, content.slice(-500));
            strictEqual(res4.headers.get("Content-Range"), `bytes ${content.length - 500}-${content.length - 1}/${content.length}`);
        }));

        it("with headers", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        headers: {
                            "server": "Deno",
                        },
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        headers: {
                            "server": "Node.js",
                        },
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const content = await readFileAsText("./examples/index.html");
            const res = await fetch(`http://localhost:${port}/assets/index.html`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, content);

            if (isDeno) {
                strictEqual(res.headers.get("Server"), "Deno");
            } else {
                strictEqual(res.headers.get("Server"), "Node.js");
            }
        }));

        it("with listDir", func(async (defer) => {
            const port = await randomPort();

            if (isDeno) {
                const server = Deno.serve({ port }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        listDir: true,
                    });
                });
                defer(() => Promise.race([server.shutdown(), sleep(100)]));
            } else {
                const server = http.createServer(withWeb(async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        listDir: true,
                    });
                }));
                server.listen(port);
                defer(() => server.close());
            }

            const res = await fetch(`http://localhost:${port}/assets/`);

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            ok(res.headers.get("Content-Type")?.includes("text/html"));
        }));
    });
});