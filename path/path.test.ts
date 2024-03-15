import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { isAbsolute, isPosixPath, isUrl, isWindowsPath, join, split } from "./index.ts";

describe("path", () => {
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
        ok(!isUrl("http://"));
    });

    it("isWindowsPath", () => {
        ok(isWindowsPath("c:"));
        ok(isWindowsPath("c:/"));
        ok(isWindowsPath("c:\\"));
        ok(isWindowsPath("d:/"));
        ok(isWindowsPath("d:\\"));
        ok(isWindowsPath("z:/"));
        ok(isWindowsPath("z:\\"));
        ok(!isWindowsPath("/"));
        ok(!isWindowsPath("\\"));
        ok(!isWindowsPath("http://"));
        ok(!isWindowsPath("https://"));
    });

    it("isPosixPath", () => {
        ok(isPosixPath("/"));
        ok(!isPosixPath("\\"));
        ok(!isPosixPath("c:/"));
        ok(!isPosixPath("c:\\"));
        ok(!isPosixPath("d:/"));
        ok(!isPosixPath("d:\\"));
        ok(!isPosixPath("z:/"));
        ok(!isPosixPath("z:\\"));
        ok(!isPosixPath("http://"));
        ok(!isPosixPath("https://"));
    });

    it("isAbsolute", () => {
        ok(isAbsolute("http://example.com"));
        ok(isAbsolute("http://example.com/foo/bar"));
        ok(isAbsolute("http://example.com/foo/bar?foo=bar"));
        ok(isAbsolute("http://example.com/foo/bar#baz"));
        ok(isAbsolute("http://example.com/foo/bar?foo=bar#baz"));
        ok(isAbsolute("c:/"));
        ok(isAbsolute("c:\\"));
        ok(isAbsolute("c:/foo/bar"));
        ok(isAbsolute("c:\\foo\\bar"));
        ok(isAbsolute("/"));
        ok(isAbsolute("/foo/bar"));
        ok(!isAbsolute("foo"));
        ok(!isAbsolute("foo/bar"));
        ok(!isAbsolute("foo\\bar"));
        ok(!isAbsolute("./foo/bar/"));
        ok(!isAbsolute("../foo/bar/"));
        ok(!isAbsolute(".\\foo\\bar"));
        ok(!isAbsolute("..\\/foo\\/bar\\"));
    });

    describe("split", () => {
        it("url", () => {
            deepStrictEqual(split("http://example.com"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com/"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com?"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com#"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com/foo"), ["http://example.com", "foo"]);
            deepStrictEqual(split("http://example.com/foo/bar"), [
                "http://example.com",
                "foo",
                "bar",
            ]);
            deepStrictEqual(split("http://example.com/foo/bar/"), [
                "http://example.com",
                "foo",
                "bar",
            ]);
            deepStrictEqual(split("http://example.com/foo/bar?"), [
                "http://example.com",
                "foo",
                "bar",
            ]);
            deepStrictEqual(split("http://example.com/foo/bar#"), [
                "http://example.com",
                "foo",
                "bar",
            ]);
            deepStrictEqual(split("http://example.com/foo/bar?foo=bar"), [
                "http://example.com",
                "foo",
                "bar",
                "?foo=bar"
            ]);
            deepStrictEqual(split("http://example.com/foo/bar#baz"), [
                "http://example.com",
                "foo",
                "bar",
                "#baz"
            ]);
            deepStrictEqual(split("http://example.com/foo//bar///baz?foo=bar&hello=world#baz"), [
                "http://example.com",
                "foo",
                "bar",
                "baz",
                "?foo=bar&hello=world",
                "#baz"
            ]);
        });

        it("windows path", () => {
            deepStrictEqual(split("c:/"), ["c:"]);
            deepStrictEqual(split("c:\\"), ["c:"]);
            deepStrictEqual(split("c:\\/"), ["c:"]);
            deepStrictEqual(split("c:/foo"), ["c:", "foo"]);
            deepStrictEqual(split("c:\\foo\\"), ["c:", "foo"]);
            deepStrictEqual(split("c:/foo//bar"), ["c:", "foo", "bar"]);
            deepStrictEqual(split("c:\\foo\\bar"), ["c:", "foo", "bar"]);
            deepStrictEqual(split("c:/foo/bar/"), ["c:", "foo", "bar"]);
            deepStrictEqual(split("c:\\foo\\bar\\"), ["c:", "foo", "bar"]);
        });

        it("posix path", () => {
            deepStrictEqual(split("/"), ["/"]);
            deepStrictEqual(split("//"), ["/"]);
            deepStrictEqual(split("///"), ["/"]);
            deepStrictEqual(split("/foo"), ["/", "foo"]);
            deepStrictEqual(split("/foo/bar"), ["/", "foo", "bar"]);
            deepStrictEqual(split("/foo//bar/"), ["/", "foo", "bar"]);
        });

        it("relative path", () => {
            deepStrictEqual(split("foo"), ["foo"]);
            deepStrictEqual(split("foo/bar"), ["foo", "bar"]);
            deepStrictEqual(split("foo//bar/"), ["foo", "bar"]);
            deepStrictEqual(split("foo\\bar"), ["foo", "bar"]);
            deepStrictEqual(split("foo\\bar\\"), ["foo", "bar"]);
        });
    });

    describe("join", () => {
        it("url", () => {
            strictEqual(join("http://example.com"), "http://example.com");
            strictEqual(join("http://example.com", "foo"), "http://example.com/foo");
            strictEqual(join("http://example.com", "foo", "bar"), "http://example.com/foo/bar");
            strictEqual(join("http://example.com", "?foo=bar"), "http://example.com?foo=bar");
            strictEqual(join("http://example.com", "#baz"), "http://example.com#baz");
            strictEqual(join(
                "http://example.com",
                "foo",
                "bar",
                "?foo=bar"
            ), "http://example.com/foo/bar?foo=bar");
            strictEqual(join(
                "http://example.com",
                "foo",
                "bar",
                "#baz"
            ), "http://example.com/foo/bar#baz");
            strictEqual(join(
                "http://example.com",
                "foo",
                "bar",
                "?foo=bar",
                "#baz"
            ), "http://example.com/foo/bar?foo=bar#baz");
        });

        it("windows path", () => {
            strictEqual(join("c:"), "c:");
            strictEqual(join("c:", "foo"), "c:\\foo");
            strictEqual(join("c:", "foo", "bar"), "c:\\foo\\bar");
            strictEqual(join("c:", "foo", "bar", "baz"), "c:\\foo\\bar\\baz");
            strictEqual(join("c:", "foo", "bar", "baz", "qux"), "c:\\foo\\bar\\baz\\qux");
        });

        it("posix path", () => {
            strictEqual(join("/"), "/");
            strictEqual(join("/", "foo"), "/foo");
            strictEqual(join("/", "foo", "bar"), "/foo/bar");
            strictEqual(join("/", "foo", "bar", "baz"), "/foo/bar/baz");
            strictEqual(join("/", "foo", "bar", "baz", "qux"), "/foo/bar/baz/qux");
        });

        it("relative path", () => {
            strictEqual(join(), ".");
            strictEqual(join(""), ".");
            strictEqual(join("", ""), ".");
            strictEqual(join("foo"), "foo");
            strictEqual(join("foo", "bar"), "foo/bar");
            strictEqual(join("foo", "bar", "baz"), "foo/bar/baz");
            strictEqual(join("foo", "bar", "baz", "qux"), "foo/bar/baz/qux");
        });
    });
});
