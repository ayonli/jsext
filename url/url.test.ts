import { ok, strictEqual } from "node:assert";
import { isFileProtocol } from "./util.ts";
import { isFileUrl, isUrl, parse } from "./index.ts";

describe("url", () => {
    it("isFileProtocol", () => {
        ok(isFileProtocol("file:"));
        ok(isFileProtocol("file://"));
        ok(!isFileProtocol("file:///"));
        ok(!isFileProtocol("file://example.com"));
    });

    it("isUrl", () => {
        ok(isUrl("http://example.com"));
        ok(isUrl("https://example.com"));
        ok(isUrl("file://example.com"));
        ok(isUrl("ftp://example.com"));
        ok(isUrl("ws://example.com"));
        ok(isUrl("wss://example.com"));
        ok(isUrl("vscode://example.com/"));
        ok(isUrl("vscode-insiders://example.com/"));
        ok(isUrl("c://example.com/"));
        ok(!isUrl("c:/example.com/"));
        ok(!isUrl("c:\\example.com\\"));
        ok(isUrl("http://"));
        ok(isUrl("file://"));
        ok(isUrl("file:///foo/bar"));
        ok(isUrl("file:/foo/bar"));
    });

    it("isFileUrl", () => {
        ok(isFileUrl("file:"));
        ok(isFileUrl("file://"));
        ok(isFileUrl("file:///"));
        ok(isFileUrl("file:/"));
        ok(isFileUrl("file:/foo/bar"));
        ok(isFileUrl("file://example.com/foo/bar"));
        ok(!isFileUrl("file:example.com/foo/bar"));
    });

    describe("parseUrl", () => {
        it("url", () => {
            const url = parse("http://example.com");
            strictEqual(url.href, "http://example.com/");
            strictEqual(url.origin, "http://example.com");
            strictEqual(url.protocol, "http:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "example.com");
            strictEqual(url.hostname, "example.com");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/");
            strictEqual(url.search, "");
            strictEqual(url.searchParams.toString(), "");
            strictEqual(url.hash, "");
        });

        it("file url", () => {
            const url = parse("file:///foo/bar");
            strictEqual(url.href, "file:///foo/bar");
            strictEqual(url.origin, "file://");
            strictEqual(url.protocol, "file:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "");
            strictEqual(url.hostname, "");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "");
            strictEqual(url.searchParams.toString(), "");
            strictEqual(url.hash, "");
        });

        it("url with search and hash", () => {
            const url = parse("http://example.com/foo/bar?foo=bar#baz");
            strictEqual(url.href, "http://example.com/foo/bar?foo=bar#baz");
            strictEqual(url.origin, "http://example.com");
            strictEqual(url.protocol, "http:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "example.com");
            strictEqual(url.hostname, "example.com");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "?foo=bar");
            strictEqual(url.searchParams.toString(), "foo=bar");
            strictEqual(url.hash, "#baz");
        });

        it("file url with host", () => {
            const url = parse("file://example.com/foo/bar?foo=bar#baz");
            strictEqual(url.href, "file://example.com/foo/bar?foo=bar#baz");
            strictEqual(url.origin, "file://example.com");
            strictEqual(url.protocol, "file:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "example.com");
            strictEqual(url.hostname, "example.com");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "?foo=bar");
            strictEqual(url.searchParams.toString(), "foo=bar");
            strictEqual(url.hash, "#baz");
        });

        it("file url with search and hash", () => {
            const url = parse("file:///foo/bar?foo=bar#baz");
            strictEqual(url.href, "file:///foo/bar?foo=bar#baz");
            strictEqual(url.origin, "file://");
            strictEqual(url.protocol, "file:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "");
            strictEqual(url.hostname, "");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "?foo=bar");
            strictEqual(url.searchParams.toString(), "foo=bar");
            strictEqual(url.hash, "#baz");
        });

        it("file url without '//'", () => {
            const url = parse("file:/foo/bar?foo=bar#baz");
            strictEqual(url.href, "file:///foo/bar?foo=bar#baz");
            strictEqual(url.origin, "file://");
            strictEqual(url.protocol, "file:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "");
            strictEqual(url.hostname, "");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "?foo=bar");
            strictEqual(url.searchParams.toString(), "foo=bar");
            strictEqual(url.hash, "#baz");
        });

        it("base url string", () => {
            const url = parse("foo/bar", "http://example.com/");
            strictEqual(url.href, "http://example.com/foo/bar");
            strictEqual(url.origin, "http://example.com");
            strictEqual(url.protocol, "http:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "example.com");
            strictEqual(url.hostname, "example.com");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "");
            strictEqual(url.searchParams.toString(), "");
            strictEqual(url.hash, "");
        });

        it("base url object", () => {
            const base = new URL("http://example.com/");
            const url = parse("foo/bar", base);
            strictEqual(url.href, "http://example.com/foo/bar");
            strictEqual(url.origin, "http://example.com");
            strictEqual(url.protocol, "http:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "example.com");
            strictEqual(url.hostname, "example.com");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "");
            strictEqual(url.searchParams.toString(), "");
            strictEqual(url.hash, "");
        });

        it("base file url", () => {
            const url = parse("bar", "file:///foo/");
            strictEqual(url.href, "file:///foo/bar");
            strictEqual(url.origin, "file://");
            strictEqual(url.protocol, "file:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "");
            strictEqual(url.hostname, "");
            strictEqual(url.port, "");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "");
            strictEqual(url.searchParams.toString(), "");
            strictEqual(url.hash, "");
        });

        it("base file url with host", () => {
            const url = parse("bar", "file://example.com:443/foo/");
            strictEqual(url.href, "file://example.com:443/foo/bar");
            strictEqual(url.origin, "file://example.com:443");
            strictEqual(url.protocol, "file:");
            strictEqual(url.username, "");
            strictEqual(url.password, "");
            strictEqual(url.host, "example.com:443");
            strictEqual(url.hostname, "example.com");
            strictEqual(url.port, "443");
            strictEqual(url.pathname, "/foo/bar");
            strictEqual(url.search, "");
            strictEqual(url.searchParams.toString(), "");
            strictEqual(url.hash, "");
        });
    });
});
