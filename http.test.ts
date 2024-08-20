import { deepStrictEqual, ok, strictEqual } from "node:assert";
import * as http from "node:http";
import type { Hono as HonoType } from "hono";
import {
    BasicAuthorization,
    Cookie,
    RequestContext,
    UserAgentInfo,
    etag,
    getCookie,
    getCookies,
    ifMatch,
    ifNoneMatch,
    parseAccepts,
    parseBasicAuth,
    parseContentType,
    parseCookie,
    parseCookies,
    parseRange,
    parseRequest,
    parseResponse,
    parseUserAgent,
    randomPort,
    serve,
    serveStatic,
    setCookie,
    setFilename,
    stringifyCookie,
    stringifyCookies,
    stringifyRequest,
    stringifyResponse,
    suggestResponseType,
    verifyBasicAuth,
} from "./http.ts";
import { withWeb } from "./http/internal.ts";
import _try from "./try.ts";
import func from "./func.ts";
import { readFileAsText } from "./fs.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import { sleep } from "./async.ts";
import { readAsJSON, readAsText } from "./reader.ts";
import { EventConsumer } from "./sse.ts";

declare const Bun: any;

describe("http", () => {
    describe("parseRequest", () => {
        if (typeof Request === "undefined") {
            return;
        }

        it("GET example", () => {
            const message = "GET /foo HTTP/1.1\r\nHost: example.com\r\n\r\n";
            const req = parseRequest(message);

            strictEqual(req.method, "GET");
            strictEqual(req.url, "http://example.com/foo");
            strictEqual(req.headers.get("host"), "example.com");
        });

        it("POST example", async () => {
            const message = "POST /foo HTTP/1.1\r\n"
                + "Host: example.com\r\n"
                + "Content-Type: application/x-www-form-urlencoded\r\n"
                + "Content-Length: 19\r\n"
                + "\r\n"
                + "foo=hello&bar=world";
            const req = parseRequest(message);

            strictEqual(req.method, "POST");
            strictEqual(req.url, "http://example.com/foo");
            strictEqual(req.headers.get("host"), "example.com");
            strictEqual(req.headers.get("content-type"), "application/x-www-form-urlencoded");
            strictEqual(req.headers.get("content-length"), "19");

            const form = new URLSearchParams(await req.text());
            strictEqual(form.get("foo"), "hello");
            strictEqual(form.get("bar"), "world");
        });
    });

    describe("parseResponse", () => {
        if (typeof Response === "undefined") {
            return;
        }

        it("200 OK example", async () => {
            const message = "HTTP/1.1 200 OK\r\nContent-Length: 13\r\n\r\nHello, World!";
            const res = parseResponse(message);

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(res.headers.get("content-length"), "13");
            strictEqual(await res.text(), "Hello, World!");
        });

        it("204 No Content example", async () => {
            const message = "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\n\r\n";
            const res = parseResponse(message);

            strictEqual(res.status, 204);
            strictEqual(res.statusText, "No Content");
            strictEqual(res.headers.get("content-length"), "0");
            strictEqual(await res.text(), "");
        });
    });

    describe("stringifyRequest", () => {
        if (typeof Request === "undefined") {
            return;
        }

        it("GET example", async () => {
            const req = new Request("http://example.com/foo");
            const message = await stringifyRequest(req);

            strictEqual(message, "GET /foo HTTP/1.1\r\nHost: example.com\r\n\r\n");
        });

        it("POST example", async () => {
            const req = new Request("http://example.com/foo", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: "foo=hello&bar=world",
            });
            const message = await stringifyRequest(req);

            strictEqual(message, "POST /foo HTTP/1.1\r\n"
                + "Host: example.com\r\n"
                + "Content-Type: application/x-www-form-urlencoded\r\n"
                + "Content-Length: 19\r\n"
                + "\r\n"
                + "foo=hello&bar=world");
        });
    });

    describe("stringifyResponse", () => {
        if (typeof Response === "undefined") {
            return;
        }

        it("200 OK example", async () => {
            const res = new Response("Hello, World!", {
                headers: {
                    "Content-Type": "text/plain",
                }
            });
            const message = await stringifyResponse(res);

            strictEqual(message, "HTTP/1.1 200 OK\r\n"
                + "Content-Type: text/plain\r\n"
                + "Content-Length: 13\r\n"
                + "\r\n"
                + "Hello, World!");
        });
    });

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
        } satisfies Cookie);

        const cookies2 = parseCookie("foo=bar; Domain=example.com");
        deepStrictEqual(cookies2, {
            name: "foo",
            value: "bar",
            domain: "example.com",
        } satisfies Cookie);

        const cookies3 = parseCookie("foo=bar; Domain=example.com; Secure");
        deepStrictEqual(cookies3, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
        } satisfies Cookie);

        const cookies4 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly");
        deepStrictEqual(cookies4, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
        } satisfies Cookie);

        const cookies5 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Strict");
        deepStrictEqual(cookies5, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "strict",
        } satisfies Cookie);

        const cookies6 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax");
        deepStrictEqual(cookies6, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
        } satisfies Cookie);

        const cookies7 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/");
        deepStrictEqual(cookies7, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
        } satisfies Cookie);

        const cookies8 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT");
        deepStrictEqual(cookies8, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
        } satisfies Cookie);

        const cookies9 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600");
        deepStrictEqual(cookies9, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
        } satisfies Cookie);

        const cookies10 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600; Expires=Wed, 09 Jun 2021 10:18:14 GMT");
        deepStrictEqual(cookies10, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
        } satisfies Cookie);

        const cookies11 = parseCookie("foo=bar; Domain=example.com; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=3600; Expires=Wed, 09 Jun 2021 10:18:14 GMT; Partitioned");
        deepStrictEqual(cookies11, {
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "none",
            path: "/",
            maxAge: 3600,
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
            partitioned: true,
        } satisfies Cookie);
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
            sameSite: "strict",
        });
        strictEqual(cookie5, "foo=bar; Domain=example.com; HttpOnly; Secure; SameSite=Strict");

        const cookie6 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
        });
        strictEqual(cookie6, "foo=bar; Domain=example.com; HttpOnly; Secure; SameSite=Lax");

        const cookie7 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
        });
        strictEqual(cookie7, "foo=bar; Domain=example.com; Path=/; HttpOnly; Secure; SameSite=Lax");

        const cookie8 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
        });
        strictEqual(cookie8, "foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; HttpOnly; Secure; SameSite=Lax");

        const cookie9 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "lax",
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
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
        });
        strictEqual(cookie10, "foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; Max-Age=3600; HttpOnly; Secure; SameSite=Lax");

        const cookie11 = stringifyCookie({
            name: "foo",
            value: "bar",
            domain: "example.com",
            secure: true,
            httpOnly: true,
            sameSite: "none",
            path: "/",
            maxAge: 3600,
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
            partitioned: true,
        });
        strictEqual(cookie11, "foo=bar; Domain=example.com; Path=/; Expires=Wed, 09 Jun 2021 10:18:14 GMT; Max-Age=3600; HttpOnly; Secure; SameSite=None; Partitioned");
    });

    it("parseCookies", () => {
        const cookies = parseCookies("foo=bar");
        deepStrictEqual(cookies, [
            { name: "foo", value: "bar" },
        ]);

        const cookies1 = parseCookies("foo=bar; baz=qux");
        deepStrictEqual(cookies1, [
            { name: "foo", value: "bar" },
            { name: "baz", value: "qux" },
        ]);

        const cookies2 = parseCookies("foo=bar; baz=qux; quux=corge");
        deepStrictEqual(cookies2, [
            { name: "foo", value: "bar" },
            { name: "baz", value: "qux" },
            { name: "quux", value: "corge" },
        ]);
    });

    it("stringifyCookies", () => {
        const cookies = stringifyCookies([
            { name: "foo", value: "bar" },
        ]);
        strictEqual(cookies, "foo=bar");

        const cookies1 = stringifyCookies([
            { name: "foo", value: "bar" },
            { name: "baz", value: "qux" },
        ]);
        strictEqual(cookies1, "foo=bar; baz=qux");

        const cookies2 = stringifyCookies([
            { name: "foo", value: "bar" },
            { name: "baz", value: "qux" },
            { name: "quux", value: "corge" },
        ]);
        strictEqual(cookies2, "foo=bar; baz=qux; quux=corge");

        const cookie: Cookie = { name: "foo", value: "bar" };
        const cookies3 = stringifyCookies([cookie]);
        strictEqual(cookies3, "foo=bar");
    });

    describe("getCookies", () => {
        it("Request", () => {
            if (typeof Request === "undefined") {
                return;
            }

            const headers = new Headers({
                "Cookie": "foo=bar; baz=qux",
            });
            const req = new Request("http://example.com", { headers });
            const cookies = getCookies(req);

            deepStrictEqual(cookies, [
                { name: "foo", value: "bar" },
                { name: "baz", value: "qux" },
            ] satisfies Cookie[]);
            deepStrictEqual(getCookies(new Request("http://example.com")), []);
        });

        it("Response", () => {
            if (typeof Response === "undefined") {
                return;
            }

            const headers = new Headers([
                ["Set-Cookie", "foo=bar; Expires=Wed, 09 Jun 2021 10:18:14 GMT"],
                ["Set-Cookie", "baz=qux; Max-Age=3600"],
            ]);
            const res = new Response(null, { headers });
            const cookies = getCookies(res);

            deepStrictEqual(cookies, [
                { name: "foo", value: "bar", expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf() },
                { name: "baz", value: "qux", maxAge: 3600 },
            ] satisfies Cookie[]);
        });
    });

    describe("getCookie", () => {
        it("Request", () => {
            if (typeof Request === "undefined") {
                return;
            }

            const headers = new Headers({
                "Cookie": "foo=bar; baz=qux",
            });
            const req = new Request("http://example.com", { headers });
            const cookie = getCookie(req, "foo");
            const cookie2 = getCookie(req, "hello");

            deepStrictEqual(cookie, { name: "foo", value: "bar" } satisfies Cookie);
            strictEqual(cookie2, null);
        });

        it("Response", () => {
            if (typeof Response === "undefined") {
                return;
            }

            const headers = new Headers([
                ["Set-Cookie", "foo=bar; Expires=Wed, 09 Jun 2021 10:18:14 GMT"],
                ["Set-Cookie", "baz=qux; Max-Age=3600"],
            ]);
            const res = new Response(null, { headers });
            const cookie = getCookie(res, "foo");
            const cookie1 = getCookie(res, "baz");
            const cookie2 = getCookie(res, "hello");

            deepStrictEqual(cookie, {
                name: "foo",
                value: "bar",
                expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
            } satisfies Cookie);
            deepStrictEqual(cookie1, {
                name: "baz",
                value: "qux",
                maxAge: 3600,
            } satisfies Cookie);
            strictEqual(cookie2, null);
        });
    });

    it("setCookie", () => {
        if (typeof Response === "undefined") {
            return;
        }

        const headers = new Headers();
        setCookie(headers, {
            name: "hello",
            value: "world",
        });

        const res = new Response(null, { headers });
        setCookie(res, {
            name: "foo",
            value: "bar",
            expires: new Date("Wed, 09 Jun 2021 10:18:14 GMT").valueOf(),
        });
        setCookie(res, {
            name: "baz",
            value: "qux",
            maxAge: 3600,
        });

        deepStrictEqual(res.headers.getSetCookie(), [
            "hello=world",
            "foo=bar; Expires=Wed, 09 Jun 2021 10:18:14 GMT",
            "baz=qux; Max-Age=3600",
        ]);
    });

    it("setFilename", () => {
        const headers = new Headers();
        setFilename(headers, "example.txt");

        strictEqual(headers.get("Content-Disposition"),
            "attachment; filename=\"example.txt\"; filename*=UTF-8''example.txt");

        const res = new Response("Hello, World!");
        setFilename(res, "你好.txt");

        strictEqual(res.headers.get("Content-Disposition"),
            "attachment; filename=\"%E4%BD%A0%E5%A5%BD.txt\"; filename*=UTF-8''%E4%BD%A0%E5%A5%BD.txt");
    });

    describe("parseUserAgent", () => {
        it("Node.js", function () {
            if (!isNode || typeof navigator === "undefined") {
                this.skip();
            }

            const info = parseUserAgent(navigator.userAgent);

            deepStrictEqual(info, {
                name: "Node.js",
                version: process.version.slice(1, 3),
                runtime: {
                    identity: "node",
                    version: process.version.slice(1, 3),
                },
                platform: "unknown",
                mobile: false,
                raw: navigator.userAgent,
            } satisfies UserAgentInfo);
        });

        it("Deno", function () {
            if (!isDeno) {
                this.skip();
            }

            const info = parseUserAgent(navigator.userAgent);
            deepStrictEqual(info, {
                name: "Deno",
                version: Deno.version.deno,
                runtime: {
                    identity: "deno",
                    version: Deno.version.deno,
                },
                platform: "unknown",
                mobile: false,
                raw: navigator.userAgent,
            } satisfies UserAgentInfo);
        });

        it("Bun", function () {
            if (!isBun) {
                this.skip();
            }

            const info = parseUserAgent(navigator.userAgent);
            deepStrictEqual(info, {
                name: "Bun",
                version: Bun.version,
                runtime: {
                    identity: "bun",
                    version: Bun.version,
                },
                platform: "unknown",
                mobile: false,
                raw: navigator.userAgent,
            } satisfies UserAgentInfo);
        });

        it("Cloudflare Workers", () => {
            const ua = "Cloudflare-Workers";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Cloudflare-Workers",
                version: undefined,
                runtime: {
                    identity: "workerd",
                    version: undefined,
                },
                platform: "unknown",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("curl in Unix/Linux", () => {
            const ua = "curl/7.68.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "curl",
                version: "7.68.0",
                runtime: undefined,
                platform: "unknown",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("curl in Windows", () => {
            const ua = "Mozilla/5.0 (Windows NT; Windows NT 10.0; zh-CN) WindowsPowerShell/5.1.22621.2506";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "WindowsPowerShell",
                version: "5.1.22621.2506",
                runtime: undefined,
                platform: "windows",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Safari in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Safari",
                version: "605.1.15",
                runtime: {
                    identity: "safari",
                    version: "605.1.15",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Safari in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Safari",
                version: "604.1",
                runtime: {
                    identity: "safari",
                    version: "604.1",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Chrome in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Chrome",
                version: "127.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "127.0.0.0",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Chrome in Windows", () => {
            const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Chrome",
                version: "127.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "127.0.0.0",
                },
                platform: "windows",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Chrome in Linux", () => {
            const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Chrome",
                version: "126.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "126.0.0.0",
                },
                platform: "linux",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Chrome in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Chrome",
                version: "114.0.5735.99",
                runtime: {
                    identity: "safari",
                    version: "604.1",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Chrome in Android", () => {
            const ua = "Mozilla/5.0 (Linux; Android 11; Jelly2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.210 Mobile Safari/537.36";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Chrome",
                version: "90.0.4430.210",
                runtime: {
                    identity: "chrome",
                    version: "90.0.4430.210",
                },
                platform: "android",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Firefox in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:129.0) Gecko/20100101 Firefox/129.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Firefox",
                version: "129.0",
                runtime: {
                    identity: "firefox",
                    version: "129.0",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Firefox in Windows", () => {
            const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Firefox",
                version: "129.0",
                runtime: {
                    identity: "firefox",
                    version: "129.0",
                },
                platform: "windows",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Firefox in Linux", () => {
            const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Firefox",
                version: "129.0",
                runtime: {
                    identity: "firefox",
                    version: "129.0",
                },
                platform: "linux",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Firefox in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/129.1  Mobile/15E148 Safari/605.1.15";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Firefox",
                version: "129.1",
                runtime: {
                    identity: "safari",
                    version: "605.1.15",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Firefox in Android", () => {
            const ua = "Mozilla/5.0 (Android 11; Mobile; rv:129.0) Gecko/129.0 Firefox/129.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Firefox",
                version: "129.0",
                runtime: {
                    identity: "firefox",
                    version: "129.0",
                },
                platform: "android",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Edge in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/127.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Edge",
                version: "127.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "126.0.0.0",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Edge in Windows", () => {
            const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Edge",
                version: "125.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "125.0.0.0",
                },
                platform: "windows",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Edge in Linux", () => {
            const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Edge",
                version: "127.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "127.0.0.0",
                },
                platform: "linux",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Edge in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/127.0.2651.102 Version/17.0 Mobile/15E148 Safari/604.1";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Edge",
                version: "127.0.2651.102",
                runtime: {
                    identity: "safari",
                    version: "604.1",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Edge in Android", () => {
            const ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 EdgA/127.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Edge",
                version: "127.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "127.0.0.0",
                },
                platform: "android",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Opera in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Opera",
                version: "112.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "126.0.0.0",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Opera in Windows", () => {
            const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Opera",
                version: "112.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "126.0.0.0",
                },
                platform: "windows",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Opera in Linux", () => {
            const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Opera",
                version: "112.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "126.0.0.0",
                },
                platform: "linux",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Opera in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1 OPT/4.4.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Opera",
                version: "4.4.0",
                runtime: {
                    identity: "safari",
                    version: "604.1",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Opera in Android", () => {
            const ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 OPR/83.0.0.0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Opera",
                version: "83.0.0.0",
                runtime: {
                    identity: "chrome",
                    version: "126.0.0.0",
                },
                platform: "android",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("DuckDuckGo in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15 Ddg/17.4.1";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "DuckDuckGo",
                version: "17.4.1",
                runtime: {
                    identity: "safari",
                    version: "605.1.15",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Quark in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X; zh-cn) AppleWebKit/601.1.46 (KHTML, like Gecko) Mobile/21F90 Quark/7.2.0.2205 Mobile";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Quark",
                version: "7.2.0.2205",
                runtime: { identity: "safari", version: "601.1.46" },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Quark in Android", () => {
            const ua = "Mozilla/5.0 (Linux; U; Android 11; en-US; Jelly2 Build/RP1A.200720.011) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.58 Quark/6.12.0.550 Mobile Safari/537.36";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Quark",
                version: "6.12.0.550",
                runtime: {
                    identity: "chrome",
                    version: "100.0.4896.58",
                },
                platform: "android",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Electron in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.89.1 Chrome/120.0.6099.291 Electron/28.2.8 Safari/537.36";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Electron",
                version: "28.2.8",
                runtime: {
                    identity: "chrome",
                    version: "120.0.6099.291",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("DingTalk in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 AliApp(DingTalk/7.1.15) com.laiwang.DingTalk/33435556 Channel/201200 language/en-CN UT4Aplus/0.0.6 WK";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "DingTalk",
                version: "7.1.15",
                runtime: {
                    identity: "safari",
                    version: "605.1.15",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("DingTalk in Android", () => {
            const ua = "Mozilla/5.0 (Linux; U; Android 11; zh-CN; Jelly2 Build/RP1A.200720.011) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/69.0.3497.100 UWS/3.22.0.36 Mobile Safari/537.36 AliApp(DingTalk/6.0.8) com.alibaba.android.rimet/14631539 Channel/1564716365480 language/en-US UT4Aplus/0.2.25 colorScheme/light";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "DingTalk",
                version: "6.0.8",
                runtime: {
                    identity: "chrome",
                    version: "69.0.3497.100",
                },
                platform: "android",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("WeChat in macOS", () => {
            const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/6.8.0(0x16080000) MacWechat/3.8.7(0x13080710) XWEB/1191 Flue";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "WeChat",
                version: "3.8.7",
                runtime: {
                    identity: "chrome",
                    version: "107.0.0.0",
                },
                platform: "darwin",
                mobile: false,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("WeChat in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.37(0x1800252f) NetType/WIFI Language/en";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "WeChat",
                version: "8.0.37",
                runtime: {
                    identity: "safari",
                    version: "605.1.15",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("WeChat in Android", () => {
            const ua = "Mozilla/5.0 (Linux; Android 11; Jelly2 Build/RP1A.200720.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36 MMWEBID/8683 MicroMessenger/8.0.50.2701(0x2800323E) WeChat/arm64 Weixin NetType/WIFI Language/en ABI/arm64";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "WeChat",
                version: "8.0.50.2701",
                runtime: {
                    identity: "chrome",
                    version: "83.0.4103.120",
                },
                platform: "android",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });

        it("Lark in iOS", () => {
            const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5.1 Mobile/15E148 Safari/604.1 Lark/7.24.10 LarkLocale/en_US ChannelName/Feishu LKBrowserIdentifier/E5E0F149-4C4C-4344-9F9A-DE2421041BE0";
            const info = parseUserAgent(ua);

            deepStrictEqual(info, {
                name: "Lark",
                version: "7.24.10",
                runtime: {
                    identity: "safari",
                    version: "604.1",
                },
                platform: "darwin",
                mobile: true,
                raw: ua,
            } satisfies UserAgentInfo);
        });
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => controller.abort());
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
                key: await readFileAsText("./examples/certs/cert.key"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
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
                    key: await readFileAsText("./examples/certs/cert.key"),
                    cert: await readFileAsText("./examples/certs/cert.pem"),
                    ca: [await readFileAsText("./examples/certs/cert.pem")],
                    rejectUnauthorized: false,
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
                key: await readFileAsText("./examples/certs/cert.key"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
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
                key: await readFileAsText("./examples/certs/cert.key"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
                ca: [await readFileAsText("./examples/certs/cert.pem")],
                rejectUnauthorized: false,
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

    describe("serve", () => {
        if (typeof fetch !== "function" ||
            typeof Request !== "function" ||
            typeof Response !== "function"
        ) {
            return;
        }

        it("default", func(async (defer) => {
            const server = serve({
                async fetch(_req, ctx) {
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                        headers: {
                            "X-Client-IP": ctx.remoteAddress?.address || "",
                        },
                    });
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "0.0.0.0");
            ok(server.port > 0);

            const res = await fetch(`http://localhost:${server.port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, "Hello, World!");
            ok(!!res.headers.get("X-Client-IP"));
        }));

        it("custom address", func(async (defer) => {
            const port = await randomPort();
            const server = serve({
                hostname: "localhost",
                port,
                async fetch(_req, ctx) {
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                        headers: {
                            "X-Client-IP": ctx.remoteAddress?.address || "",
                        },
                    });
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "localhost");
            strictEqual(server.port, port);

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, "Hello, World!");
            ok(!!res.headers.get("X-Client-IP"));
        }));

        it("HTTPS", func(async function (defer) {
            if (!isNode) {
                this.skip();
            }

            const port = await randomPort();
            const server = serve({
                hostname: "localhost",
                port,
                key: await readFileAsText("./examples/certs/cert.key"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
                async fetch(_req) {
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                    });
                }
            });
            defer(() => {
                if (typeof process === "object" &&
                    [20, 21].includes(parseInt(process.version.slice(1)))
                ) {
                    // Cannot close the server in Node.js v20 and v21, reason unknown.
                    return Promise.race([server.close(true), sleep(100)]);
                } else {
                    return server.close(true);
                }
            });

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "localhost");
            strictEqual(server.port, port);

            const https = await import("node:https");
            const res = await new Promise<{
                url: string;
                status: number;
                statusText: string;
                headers: Record<string, string>;
                body?: any;
            }>(async (resolve, reject) => {
                const req = https.request({
                    key: await readFileAsText("./examples/certs/cert.key"),
                    cert: await readFileAsText("./examples/certs/cert.pem"),
                    ca: [await readFileAsText("./examples/certs/cert.pem")],
                    rejectUnauthorized: false,
                    method: "GET",
                    host: "localhost",
                    port,
                }, async (res) => {
                    try {
                        const text = await readAsText(res);
                        resolve({
                            url: res.url!,
                            status: res.statusCode!,
                            statusText: res.statusMessage!,
                            headers: res.headers as Record<string, string>,
                            body: text,
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
                req.end();
            });

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(res.body, "Hello, World!");
        }));

        it("HTTP2", func(async function (defer) {
            if (!isNode) {
                this.skip();
            }

            const port = await randomPort();
            const server = serve({
                hostname: "localhost",
                port,
                key: await readFileAsText("./examples/certs/cert.key"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
                async fetch(_req) {
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                    });
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "localhost");
            strictEqual(server.port, port);

            const http2 = await import("node:http2");
            const client = http2.connect(`https://localhost:${port}`, {
                key: await readFileAsText("./examples/certs/cert.key"),
                cert: await readFileAsText("./examples/certs/cert.pem"),
                ca: [await readFileAsText("./examples/certs/cert.pem")],
                rejectUnauthorized: false,
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
                    ":method": "GET",
                    ":path": "/",
                }, {
                    endStream: false,
                });

                req.once("response", async (headers) => {
                    try {
                        const text = await readAsText(req);
                        resolve({
                            url: `https://localhost:${port}/`,
                            status: headers[":status"]!,
                            statusText: "",
                            headers: Object.fromEntries(Object.entries(headers).filter(([key]) => {
                                return key.startsWith(":") === false;
                            })) as Record<string, string>,
                            body: text
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
                req.end();
            });

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "");
            strictEqual(res.body, "Hello, World!");
        }));

        it("SSE", func(async function (defer) {
            const server = serve({
                async fetch(_req, ctx) {
                    const { events, response } = ctx.createEventEndpoint();

                    setTimeout(() => {
                        events.dispatchEvent(new MessageEvent("message", {
                            data: "Hello, World!",
                        }));
                    }, 1000);

                    return response;
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "0.0.0.0");
            ok(server.port > 0);

            const res = await fetch(`http://localhost:${server.port}`);
            const client = new EventConsumer(res);

            const text = await new Promise<string>((resolve) => {
                client.addEventListener("message", (event) => {
                    resolve(event.data as string);
                });
            });

            strictEqual(text, "Hello, World!");
        }));

        it("WebSocket", func(async function (defer) {
            this.timeout(5_000);

            const server = serve({
                fetch(_req, ctx) {
                    const { socket, response } = ctx.upgradeWebSocket();

                    socket.addEventListener("open", () => {
                        socket.send("Hello, World!");
                    });

                    return response;
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "0.0.0.0");
            ok(server.port > 0);

            let ws: WebSocket;

            if (typeof WebSocket === "function") {
                ws = new WebSocket(`ws://localhost:${server.port}`);
            } else {
                const dWebSocket = (await import("isomorphic-ws")).default;
                ws = new dWebSocket(`ws://localhost:${server.port}`) as unknown as WebSocket;
            }

            const text = await new Promise<string>((resolve, reject) => {
                ws.binaryType = "arraybuffer";
                ws.onopen = () => {
                    ws.send("text");
                };
                ws.onmessage = (event) => {
                    resolve(event.data as string);
                };
                ws.onerror = () => reject(new Error("WebSocket error"));
            });

            ws.close();
            strictEqual(text, "Hello, World!");
        }));

        it("timing metrics", func(async (defer) => {
            const server = serve({
                async fetch(req, ctx) {
                    const { searchParams } = new URL(req.url);
                    if (searchParams.has("withTotal")) {
                        ctx.time("total");
                    }

                    ctx.time("db", "Database Query");
                    await sleep(50);
                    ctx.timeEnd("db");

                    ctx.time("api");
                    await sleep(100);
                    ctx.timeEnd("api");

                    // This will be ignored since it lacks a corresponding `timeEnd`.
                    ctx.time("cache");

                    if (searchParams.has("withTotal")) {
                        ctx.timeEnd("total");
                    }

                    return new Response("Hello, World!");
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "0.0.0.0");
            ok(server.port > 0);

            const res1 = await fetch(`http://localhost:${server.port}`);
            const text1 = await res1.text();
            const metrics1 = res1.headers.get("Server-Timing");

            strictEqual(res1.status, 200);
            strictEqual(text1, "Hello, World!");
            ok(/db;dur=\d{2};desc=\"Database Query\", api;dur=\d{2,3}/.test(metrics1 ?? ""));

            const res2 = await fetch(`http://localhost:${server.port}?withTotal`);
            const text2 = await res2.text();
            const metrics2 = res2.headers.get("Server-Timing");

            strictEqual(res2.status, 200);
            strictEqual(text2, "Hello, World!");
            ok(/db;dur=\d{2};desc=\"Database Query\", api;dur=\d{2,3}, total;dur=\d{3};desc=\"Total\"/.test(metrics2 ?? ""));
        }));

        it("with Hono framework", func(async function (defer) {
            this.timeout(5_000);

            const Hono = (await import("hono")).Hono as typeof HonoType;

            const app = new Hono<{
                Bindings: Pick<RequestContext, "remoteAddress" | "upgradeWebSocket">;
            }>()
                .get("/", async (ctx) => {
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                        headers: {
                            "X-Client-IP": ctx.env.remoteAddress?.address || "",
                        },
                    });
                }).get("/ws", async (ctx) => {
                    const { socket, response } = ctx.env.upgradeWebSocket();
                    socket.addEventListener("open", () => {
                        socket.send("Hello, World!");
                    });
                    return response;
                });

            const server = serve({ fetch: app.fetch });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "0.0.0.0");
            ok(server.port > 0);

            const res = await fetch(`http://localhost:${server.port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, "Hello, World!");
            ok(!!res.headers.get("X-Client-IP"));

            let ws: WebSocket;

            if (typeof WebSocket === "function") {
                ws = new WebSocket(`ws://localhost:${server.port}/ws`);
            } else {
                const dWebSocket = (await import("isomorphic-ws")).default;
                ws = new dWebSocket(`ws://localhost:${server.port}/ws`) as unknown as WebSocket;
            }

            const text2 = await new Promise<string>((resolve, reject) => {
                ws.binaryType = "arraybuffer";
                ws.onopen = () => {
                    ws.send("text");
                };
                ws.onmessage = (event) => {
                    resolve(event.data as string);
                };
                ws.onerror = () => reject(new Error("WebSocket error"));
            });

            ws.close();
            strictEqual(text2, "Hello, World!");
        }));

        it("with type module", func(async function (defer) {
            const port = await randomPort();
            const server = serve({
                type: "module",
                port,
                async fetch(_req) {
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                    });
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "module");
            strictEqual(typeof server.fetch, "function");

            if (isBun) {
                const _server = Bun.serve({
                    port,
                    fetch: server.fetch!,
                });
                defer(() => _server.stop(true));
            } else if (isDeno) {
                const controller = new AbortController();
                await new Promise((resolve) => {
                    Deno.serve({
                        port,
                        signal: controller.signal,
                        onListen: resolve,
                    }, async (req) => {
                        return server.fetch!(req);
                    });
                });
                defer(() => controller.abort());
            } else if (isNode) {
                const _server = serve({
                    port,
                    fetch: server.fetch!,
                });
                defer(() => _server.close(true));
                await _server.ready;
            }

            await server.ready;
            strictEqual(server.hostname, isBun ? "0.0.0.0" : "");
            strictEqual(server.port, isBun ? 3000 : 0);

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, "Hello, World!");
        }));

        it("onListen and onError", func(async function (defer) {
            let listened = false;
            let error: Error | null = null;

            const server = serve({
                async fetch(_req) {
                    throw new Error("Something went wrong");
                },
                onListen() {
                    listened = true;
                },
                onError(err) {
                    error = err as Error;
                    return new Response("Something went wrong", {
                        status: 500,
                        statusText: "Internal Server Error",
                    });
                }
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "0.0.0.0");
            ok(server.port > 0);
            strictEqual(listened, true);

            const res = await fetch(`http://localhost:${server.port}`);
            const text = await res.text();

            strictEqual(res.status, 500);
            strictEqual(res.statusText, "Internal Server Error");
            strictEqual(text, "Something went wrong");
            strictEqual(String(error), "Error: Something went wrong");
        }));

        it("Custom headers", func(async (defer) => {
            const server = serve({
                async fetch(_req, ctx) {
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                        headers: {
                            "X-Client-IP": ctx.remoteAddress?.address || "",
                        },
                    });
                },
                headers: {
                    "X-Powered-By": "JsExt",
                },
            });
            defer(() => server.close(true));

            strictEqual(server.type, "classic");
            strictEqual(typeof server.fetch, "undefined");

            await server.ready;
            strictEqual(server.hostname, "0.0.0.0");
            ok(server.port > 0);

            const res = await fetch(`http://localhost:${server.port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(res.statusText, "OK");
            strictEqual(text, "Hello, World!");
            strictEqual(res.headers.get("X-Powered-By"), "JsExt");
        }));

        it("AbortSignal", func(async function (defer) {
            if (typeof AbortSignal !== "function" ||
                typeof AbortSignal.timeout !== "function" ||
                isDeno // Deno currently does not support request cancellation.
            ) {
                this.skip();
            }

            const results: {
                aborted: true;
                reason: any;
            }[] = [];
            const server = serve({
                async fetch(req) {
                    req.signal.addEventListener("abort", () => {
                        results.push({ aborted: true, reason: req.signal.reason });
                    });

                    await sleep(1000);
                    return new Response("Hello, World!", {
                        status: 200,
                        statusText: "OK",
                    });
                },
            });
            defer(() => server.close(true));
            await server.ready;

            const [err, res1] = await _try(fetch(`http://localhost:${server.port}`, {
                signal: AbortSignal.timeout(500),
            }));
            const res2 = await fetch(`http://localhost:${server.port}`);

            strictEqual((err as DOMException)?.name, "TimeoutError");
            strictEqual(res1, undefined);
            strictEqual(res2.status, 200);
            strictEqual(res2.statusText, "OK");
            strictEqual(await res2.text(), "Hello, World!");
            strictEqual(results.length, 1);
            strictEqual(results[0]!.aborted, true);
            strictEqual((results[0]!.reason as DOMException)!.name, "AbortError");
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req);
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                    });
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                    });
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        maxAge: 3600,
                    });
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        headers: {
                            "server": "Deno",
                        },
                    });
                });
                defer(() => controller.abort());
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
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async (req) => {
                    return serveStatic(req, {
                        fsDir: "./examples",
                        urlPrefix: "/assets",
                        listDir: true,
                    });
                });
                defer(() => controller.abort());
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

    describe("suggestResponseType", () => {
        if (typeof Request !== "function") {
            return;
        }

        it("text", () => {
            const req0 = new Request("http://localhost");
            const req1 = new Request("http://localhost", {
                headers: {
                    "Accept": "text/plain",
                }
            });
            const req2 = new Request("http://localhost/script.js", {
                headers: {
                    "Sec-Fetch-Dest": "script",
                }
            });
            const req3 = new Request("http://localhost/style.css", {
                headers: {
                    "Sec-Fetch-Dest": "style",
                }
            });
            const req4 = new Request("http://localhost/track.vtt", {
                headers: {
                    "Sec-Fetch-Dest": "track",
                }
            });
            const req5 = new Request("http://localhost", {
                headers: {
                    "Accept": "application/x-www-form-urlencoded",
                }
            });

            strictEqual(suggestResponseType(req0), "text");
            strictEqual(suggestResponseType(req1), "text");
            strictEqual(suggestResponseType(req2), "text");
            strictEqual(suggestResponseType(req3), "text");
            strictEqual(suggestResponseType(req4), "text");
            strictEqual(suggestResponseType(req5), "text");
        });

        it("html", () => {
            const req1 = new Request("http://localhost", {
                headers: {
                    "Accept": "text/html",
                }
            });
            const req2 = new Request("http://localhost", {
                headers: {
                    "Sec-Fetch-Dest": "document",
                }
            });
            const req3 = new Request("http://localhost", {
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
                }
            });
            const req4 = new Request("http://localhost/hello.html");
            const req5 = new Request("http://localhost/hello.htm");

            strictEqual(suggestResponseType(req1), "html");
            strictEqual(suggestResponseType(req2), "html");
            strictEqual(suggestResponseType(req3), "html");
            strictEqual(suggestResponseType(req4), "html");
            strictEqual(suggestResponseType(req5), "html");
        });

        it("xml", () => {
            const req1 = new Request("http://localhost", {
                headers: {
                    "Accept": "text/xml",
                }
            });
            const req2 = new Request("http://localhost", {
                headers: {
                    "Accept": "application/xml",
                    "Sec-Fetch-Dest": "document",
                }
            });
            const req3 = new Request("http://localhost", {
                method: "POST",
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/xml",
                },
                body: `<xml><foo>hello</foo><bar>world</bar/></xml>`,
            });
            const req4 = new Request("http://localhost/hello.xml");

            strictEqual(suggestResponseType(req1), "xml");
            strictEqual(suggestResponseType(req2), "xml");
            strictEqual(suggestResponseType(req3), "xml");
            strictEqual(suggestResponseType(req4), "xml");
        });

        it("json", () => {
            const req1 = new Request("http://localhost", {
                headers: {
                    "Accept": "application/json",
                }
            });
            const req2 = new Request("http://localhost/manifest", {
                headers: {
                    "Sec-Fetch-Dest": "manifest",
                }
            });
            const req3 = new Request("http://localhost", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ hello: "world" }),
            });
            const req4 = new Request("http://localhost", {
                headers: {
                    "Accept": "*/*",
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            const req5 = new Request("http://localhost/api/hello");
            const req6 = new Request("http://localhost/hello.json");

            strictEqual(suggestResponseType(req1), "json");
            strictEqual(suggestResponseType(req2), "json");
            strictEqual(suggestResponseType(req3), "json");
            strictEqual(suggestResponseType(req4), "json");
            strictEqual(suggestResponseType(req5), "json");
            strictEqual(suggestResponseType(req6), "json");
        });

        it("stream", () => {
            const req0 = new Request("http://localhost", {
                headers: {
                    "Accept": "text/event-stream",
                }
            });
            const req1 = new Request("http://localhost", {
                headers: {
                    "Accept": "application/octet-stream",
                }
            });
            const req2 = new Request("http://localhost", {
                headers: {
                    "Accept": "image/*",
                }
            });
            const req3 = new Request("http://localhost", {
                headers: {
                    "Accept": "audio/*",
                }
            });
            const req4 = new Request("http://localhost", {
                headers: {
                    "Accept": "video/*",
                }
            });
            const req5 = new Request("http://localhost", {
                headers: {
                    "Sec-Fetch-Dest": "image",
                }
            });
            const req6 = new Request("http://localhost", {
                headers: {
                    "Sec-Fetch-Dest": "audio",
                }
            });
            const req7 = new Request("http://localhost", {
                headers: {
                    "Sec-Fetch-Dest": "video",
                }
            });
            const req8 = new Request("http://localhost", {
                headers: {
                    "Accept": "multipart/form-data",
                }
            });

            strictEqual(suggestResponseType(req0), "stream");
            strictEqual(suggestResponseType(req1), "stream");
            strictEqual(suggestResponseType(req2), "stream");
            strictEqual(suggestResponseType(req3), "stream");
            strictEqual(suggestResponseType(req4), "stream");
            strictEqual(suggestResponseType(req5), "stream");
            strictEqual(suggestResponseType(req6), "stream");
            strictEqual(suggestResponseType(req7), "stream");
            strictEqual(suggestResponseType(req8), "stream");
        });

        it("none", () => {
            const req1 = new Request("http://localhost", {
                method: "HEAD"
            });
            const req2 = new Request("http://localhost", {
                method: "OPTIONS"
            });

            strictEqual(suggestResponseType(req1), "none");
            strictEqual(suggestResponseType(req2), "none");
        });
    });
});
