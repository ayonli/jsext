import { deepStrictEqual, strictEqual } from "node:assert";
import * as http from "node:http";
import { parseAccepts, parseContentType, parseCookie, stringifyCookie, withWeb } from "./http.ts";
import func from "./func.ts";

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
            sameSize: "Strict",
        });

        const cookies6 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax");
        deepStrictEqual(cookies6, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSize: "Lax",
        });

        const cookies7 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/");
        deepStrictEqual(cookies7, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSize: "Lax",
            path: "/",
        });

        const cookies8 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT");
        deepStrictEqual(cookies8, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSize: "Lax",
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
            sameSize: "Lax",
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
            sameSize: "Lax",
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
            sameSize: "Strict",
        });
        strictEqual(cookie5, "foo=bar; Domain=example.com; HttpOnly; Secure; SameSite=Strict");

        const cookie6 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSize: "Lax",
        });
        strictEqual(cookie6, "foo=bar; Domain=example.com; HttpOnly; Secure; SameSite=Lax");

        const cookie7 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSize: "Lax",
            path: "/",
        });
        strictEqual(cookie7, "foo=bar; Domain=example.com; Path=/; HttpOnly; Secure; SameSite=Lax");

        const cookie8 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSize: "Lax",
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
            sameSize: "Lax",
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
            sameSize: "Lax",
            path: "/",
            maxAge: 3600,
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT"),
        });
        strictEqual(cookie10, "foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; Max-Age=3600; HttpOnly; Secure; SameSite=Lax");
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

            const server = http.createServer(withWeb(app.fetch));
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
