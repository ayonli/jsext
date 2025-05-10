import { deepStrictEqual, ok, strictEqual } from "node:assert";
import * as path from "node:path";
import { contains, split } from "./util.ts";
import {
    basename,
    cwd,
    dirname,
    endsWith,
    equals,
    extname,
    isAbsolute,
    isFileUrl,
    isPosixPath,
    isFsPath,
    isUrl,
    isWindowsPath,
    join,
    normalize,
    resolve,
    sanitize,
    startsWith,
    toFileUrl,
    toFsPath,
} from "./index.ts";
import _try from "@jsext/try";
import { as } from "@jsext/object";

describe("path", () => {
    it("sep", () => {
        if (typeof Deno === "object" && Deno.build?.os === "windows") {
            strictEqual(path.sep, "\\");
        } else if (typeof process === "object" && process.platform === "win32") {
            strictEqual(path.sep, "\\");
        } else {
            strictEqual(path.sep, "/");
        }
    });

    it("cwd", () => {
        if (typeof Deno === "object" && typeof Deno.cwd === "function") {
            strictEqual(cwd(), Deno.cwd());
        } else if (typeof process === "object" && typeof process.cwd === "function") {
            strictEqual(cwd(), process.cwd());
        } else if (typeof location === "object" && location.origin) {
            strictEqual(cwd(), location.origin + (location.pathname === "/" ? "" : location.pathname));
        }
    });

    it("isWindowsPath", () => {
        ok(isWindowsPath("c:"));
        ok(isWindowsPath("c:/"));
        ok(isWindowsPath("c:\\"));
        ok(isWindowsPath("D:/"));
        ok(isWindowsPath("D:\\"));
        ok(isWindowsPath("c:/foo/bar"));
        ok(isWindowsPath("c:\\foo\\bar"));
        ok(isWindowsPath("c:/foo/bar/"));
        ok(isWindowsPath("c:\\foo\\bar\\"));
        ok(isWindowsPath("c:/foo/bar?foo=bar"));
        ok(isWindowsPath("c:\\foo\\bar?foo=bar"));
        ok(isWindowsPath("c:/foo/bar#baz"));
        ok(isWindowsPath("c:\\foo\\bar#baz"));
        ok(isWindowsPath("c:/foo/bar?foo=bar#baz"));
        ok(isWindowsPath("c:\\foo\\bar?foo=bar#baz"));
        ok(isWindowsPath("c:\\目录\\文件"));
        ok(!isWindowsPath("/"));
        ok(!isWindowsPath("\\"));
        ok(!isWindowsPath("http://"));
        ok(!isWindowsPath("foo/bar"));
    });

    it("isPosixPath", () => {
        ok(isPosixPath("/"));
        ok(isPosixPath("/foo/bar"));
        ok(isPosixPath("/foo/bar/"));
        ok(isPosixPath("/foo/bar?foo=bar"));
        ok(isPosixPath("/foo/bar#baz"));
        ok(isPosixPath("/foo/bar?foo=bar#baz"));
        ok(isPosixPath("/目录/文件"));
        ok(!isPosixPath("\\"));
        ok(!isPosixPath("c:"));
        ok(!isPosixPath("c:/"));
        ok(!isPosixPath("c:\\"));
        ok(!isPosixPath("http://"));
        ok(!isPosixPath("foo/bar"));
    });

    it("isFsPath", () => {
        ok(isFsPath("/"));
        ok(isFsPath("/foo/bar"));
        ok(isFsPath("c:"));
        ok(isFsPath("c:/"));
        ok(isFsPath("c:\\"));
        ok(isFsPath("c:/foo/bar"));
        ok(isFsPath("c:\\foo\\bar"));
        ok(isFsPath("./foo/bar/"));
        ok(isFsPath("../foo/bar/"));
        ok(isFsPath(".\\foo\\bar"));
        ok(isFsPath("..\\foo\\bar"));
        ok(!isFsPath("http://example.com/foo/bar"));
        ok(!isFsPath("file:///foo/bar"));
        ok(!isFsPath("foo/bar"));
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
        ok(isUrl("file:"));
        ok(!isUrl("http:"));
        ok(isUrl("file:///foo/bar"));
        ok(isUrl("file:/foo/bar"));
        ok(isUrl("http://example.com/foo/bar"));
        ok(isUrl("http://example.com/foo/bar?foo=bar"));
        ok(isUrl("http://example.com/foo/bar#baz"));
        ok(isUrl("http://example.com/foo/bar?foo=bar#baz"));
        ok(isUrl("http://example.com/目录/文件"));
        ok(!isUrl("http:example.com/foo/bar"));
        ok(!isUrl("example.com/foo/bar"));
        ok(!isUrl("foo/bar"));
    });

    it("isFileUrl", () => {
        ok(isFileUrl("file:"));
        ok(isFileUrl("file://"));
        ok(isFileUrl("file:///"));
        ok(isFileUrl("file:/"));
        ok(isFileUrl("file:/foo/bar"));
        ok(isFileUrl("file://example.com/foo/bar"));
        ok(!isFileUrl("file:example.com/foo/bar"));
        ok(isFileUrl("file:///foo/bar?foo=bar"));
        ok(isFileUrl("file:///foo/bar#baz"));
        ok(isFileUrl("file:///foo/bar?foo=bar#baz"));
        ok(isFileUrl("file:/foo/bar?foo=bar"));
        ok(isFileUrl("file:/foo/bar#baz"));
        ok(isFileUrl("file:/foo/bar?foo=bar#baz"));
        ok(isFileUrl("file:///目录/文件"));
        ok(isFileUrl("file:/目录/文件"));
        ok(isFileUrl(new URL("file:///c:/foo/bar")));
    });

    describe("isAbsolute", () => {
        it("windows path", () => {
            ok(isAbsolute("c:/"));
            ok(isAbsolute("c:\\"));
            ok(isAbsolute("D:/"));
            ok(isAbsolute("D:\\"));
            ok(isAbsolute("c:/foo/bar"));
            ok(isAbsolute("c:\\foo\\bar"));
            ok(isAbsolute("c:/foo/bar?foo=bar"));
            ok(isAbsolute("c:\\foo\\bar?foo=bar"));
            ok(isAbsolute("c:/foo/bar#baz"));
            ok(isAbsolute("c:\\foo\\bar#baz"));
            ok(isAbsolute("c:/foo/bar?foo=bar#baz"));
            ok(isAbsolute("c:\\foo\\bar?foo=bar#baz"));
            ok(isAbsolute("c:\\目录\\文件"));
        });

        it("posix path", () => {
            ok(isAbsolute("/"));
            ok(isAbsolute("/foo/bar"));
            ok(isAbsolute("/foo/bar?foo=bar"));
            ok(isAbsolute("/foo/bar#baz"));
            ok(isAbsolute("/foo/bar?foo=bar#baz"));
            ok(isAbsolute("/目录/文件"));
        });

        it("url", () => {
            ok(isAbsolute("http://example.com"));
            ok(isAbsolute("http://example.com/foo/bar"));
            ok(isAbsolute("http://example.com/foo/bar?foo=bar"));
            ok(isAbsolute("http://example.com/foo/bar#baz"));
            ok(isAbsolute("http://example.com/foo/bar?foo=bar#baz"));
            ok(isAbsolute("http://example.com/目录/文件"));
        });

        it("file url", () => {
            ok(isAbsolute("file:///"));
            ok(isAbsolute("file:///foo/bar"));
            ok(isAbsolute("file:///foo/bar?foo=bar"));
            ok(isAbsolute("file:///foo/bar#baz"));
            ok(isAbsolute("file:///foo/bar?foo=bar#baz"));
            ok(isAbsolute("file:///目录/文件"));
        });

        it("relative path", () => {
            ok(!isAbsolute("foo"));
            ok(!isAbsolute("foo/bar"));
            ok(!isAbsolute("foo\\bar"));
            ok(!isAbsolute("./foo/bar/"));
            ok(!isAbsolute("../foo/bar/"));
            ok(!isAbsolute(".\\foo\\bar"));
            ok(!isAbsolute("..\\/foo\\/bar\\"));
            ok(!isAbsolute("foo/bar?foo=bar"));
            ok(!isAbsolute("foo/bar#baz"));
            ok(!isAbsolute("foo/bar?foo=bar#baz"));
            ok(!isAbsolute("目录/文件?foo=bar#baz"));
        });
    });

    describe("split", () => {
        it("windows path", () => {
            deepStrictEqual(split("c:"), ["c:\\"]);
            deepStrictEqual(split("c:/"), ["c:\\"]);
            deepStrictEqual(split("c:\\"), ["c:\\"]);
            deepStrictEqual(split("c:\\/"), ["c:\\"]);
            deepStrictEqual(split("c:/foo"), ["c:\\", "foo"]);
            deepStrictEqual(split("c:\\foo\\"), ["c:\\", "foo"]);
            deepStrictEqual(split("c:/foo//bar"), ["c:\\", "foo", "bar"]);
            deepStrictEqual(split("c:\\foo\\bar"), ["c:\\", "foo", "bar"]);
            deepStrictEqual(split("c:/foo/bar/"), ["c:\\", "foo", "bar"]);
            deepStrictEqual(split("c:\\foo\\bar\\"), ["c:\\", "foo", "bar"]);
            deepStrictEqual(
                split("c:\\foo\\bar?foo=bar#baz"),
                ["c:\\", "foo", "bar", "?foo=bar", "#baz"]
            );
            deepStrictEqual(split("c:/目录/文件"), ["c:\\", "目录", "文件"]);
        });

        it("posix path", () => {
            deepStrictEqual(split("/"), ["/"]);
            deepStrictEqual(split("//"), ["/"]);
            deepStrictEqual(split("///"), ["/"]);
            deepStrictEqual(split("/foo"), ["/", "foo"]);
            deepStrictEqual(split("/foo/bar"), ["/", "foo", "bar"]);
            deepStrictEqual(split("/foo/bar/"), ["/", "foo", "bar"]);
            deepStrictEqual(split("/foo/bar?foo=bar#baz"), ["/", "foo", "bar", "?foo=bar", "#baz"]);
            deepStrictEqual(split("/目录/文件"), ["/", "目录", "文件"]);
        });

        it("url", () => {
            deepStrictEqual(split("http://example.com"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com/"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com?"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com#"), ["http://example.com"]);
            deepStrictEqual(split("http://example.com/foo"), ["http://example.com", "foo"]);
            deepStrictEqual(
                split("http://example.com/foo/bar"),
                ["http://example.com", "foo", "bar"]
            );
            deepStrictEqual(
                split("http://example.com/foo/bar/"),
                ["http://example.com", "foo", "bar"]
            );
            deepStrictEqual(
                split("http://example.com/foo/bar?"),
                ["http://example.com", "foo", "bar"]
            );
            deepStrictEqual(
                split("http://example.com/foo/bar#"),
                ["http://example.com", "foo", "bar"]
            );
            deepStrictEqual(
                split("http://example.com/foo/bar?foo=bar"),
                ["http://example.com", "foo", "bar", "?foo=bar"]
            );
            deepStrictEqual(
                split("http://example.com/foo/bar#baz"),
                ["http://example.com", "foo", "bar", "#baz"]
            );
            deepStrictEqual(
                split("http://example.com/foo//bar///baz?foo=bar#baz"),
                ["http://example.com", "foo", "bar", "baz", "?foo=bar", "#baz"]
            );
            deepStrictEqual(split("?foo=bar"), ["?foo=bar"]);
            deepStrictEqual(split("#baz"), ["#baz"]);
            deepStrictEqual(split("?foo=bar#baz"), ["?foo=bar", "#baz"]);
            deepStrictEqual(split("?foo=hello&bar=world#baz"), ["?foo=hello&bar=world", "#baz"]);
            deepStrictEqual(
                split("http://example.com/目录/文件"),
                ["http://example.com", "目录", "文件"]
            );
        });

        it("file url", () => {
            deepStrictEqual(split("file:"), ["file:///"]);
            deepStrictEqual(split("file://"), ["file:///"]);
            deepStrictEqual(split("file:///"), ["file:///"]);
            deepStrictEqual(split("file:///foo"), ["file:///", "foo"]);
            deepStrictEqual(split("file:///foo/bar"), ["file:///", "foo", "bar"]);
            deepStrictEqual(split("file:///foo/bar/"), ["file:///", "foo", "bar"]);
            deepStrictEqual(split("file://localhost/foo/bar/"), ["file:///", "foo", "bar"]);
            deepStrictEqual(split("file:///c:/foo/bar/"), ["file:///", "c:", "foo", "bar"]);
            deepStrictEqual(split("file://localhost/c:/foo/bar/"), ["file:///", "c:", "foo", "bar"]);
            deepStrictEqual(
                split("file://example.com/foo/bar/"),
                ["file://example.com", "foo", "bar"]
            );
            deepStrictEqual(
                split("file://example.com/foo/bar?foo=bar#baz"),
                ["file://example.com", "foo", "bar", "?foo=bar", "#baz"]
            );
            deepStrictEqual(split("file:///目录/文件"), ["file:///", "目录", "文件"]);
        });

        it("relative path", () => {
            deepStrictEqual(split("foo"), ["foo"]);
            deepStrictEqual(split("foo/"), ["foo"]);
            deepStrictEqual(split("foo/bar"), ["foo", "bar"]);
            deepStrictEqual(split("foo//bar/"), ["foo", "bar"]);
            deepStrictEqual(split("foo\\bar"), ["foo", "bar"]);
            deepStrictEqual(split("foo\\bar\\"), ["foo", "bar"]);
            deepStrictEqual(split("foo/bar?foo=bar"), ["foo", "bar", "?foo=bar"]);
            deepStrictEqual(split(".."), [".."]);
            deepStrictEqual(split("../foo/bar"), ["..", "foo", "bar"]);
            deepStrictEqual(split("../../foo/bar"), ["..", "..", "foo", "bar"]);
            deepStrictEqual(split("foo/../.."), ["foo", "..", ".."]);
            deepStrictEqual(split("."), ["."]);
            deepStrictEqual(split("./foo/bar"), [".", "foo", "bar"]);
            deepStrictEqual(split("./文件/目录"), [".", "文件", "目录"]);
            deepStrictEqual(split(""), []);
        });
    });

    describe("contains", () => {
        it("windows path", () => {
            ok(contains("c:/foo/bar", ""));
            ok(contains("c:/foo/bar", "c:"));
            ok(contains("c:/foo/bar", "c:/"));
            ok(contains("c:/foo/bar", "c:\\"));
            ok(contains("c:/foo/bar", "c:/foo/bar"));
            ok(contains("c:/foo/bar/", "c:/foo/bar"));
            ok(contains("c:/foo/bar/", "c:/foo/bar/"));
            ok(contains("c:/foo/bar", "c:/foo"));
            ok(contains("c:/foo/bar/", "c:/foo/"));
            ok(contains("c:/foo/bar?foo=bar", "c:/foo"));
            ok(contains("c:/foo/bar#baz", "c:/foo"));
            ok(contains("c:/foo/bar", "c:/foo?foo=bar"));
            ok(contains("c:/foo/bar", "c:/foo#baz"));
            ok(contains("c:/foo/bar", "c:/foo?foo=bar#baz"));
            ok(contains("c:/foo/bar", "c:/foo#baz?foo=bar"));
            ok(contains("c:/foo/bar", "c:/foo/bar?foo=bar"));
            ok(contains("c:/foo/bar", "c:/foo/bar#baz"));
            ok(contains("c:/foo/bar", "c:/foo/bar?foo=bar#baz"));
            ok(contains("c:/foo/bar", "foo"));
            ok(contains("c:/foo/bar", "bar"));
            ok(contains("c:/目录/文件", "目录"));
            ok(contains("c:/目录/文件", "文件"));
            ok(!contains("c:/foo/bar", "c:/bar"));
            ok(!contains("c:/foo/bar", "/foo/bar"));
            ok(!contains("c:/foo/bar", "file:///c:/foo/bar"));
        });

        it("posix path", () => {
            ok(contains("/foo/bar", ""));
            ok(contains("/foo/bar", "/"));
            ok(contains("/foo/bar", "/foo"));
            ok(contains("/foo/bar", "/foo/"));
            ok(contains("/foo/bar", "/foo/bar"));
            ok(contains("/foo/bar/", "/foo/bar"));
            ok(contains("/foo/bar/", "/foo/bar/"));
            ok(contains("/foo/bar", "/foo?foo=bar"));
            ok(contains("/foo/bar", "/foo#baz"));
            ok(contains("/foo/bar", "/foo?foo=bar#baz"));
            ok(contains("/foo/bar", "foo"));
            ok(contains("/foo/bar", "bar"));
            ok(contains("/目录/文件", "目录"));
            ok(contains("/目录/文件", "文件"));
            ok(!contains("/foo/bar", "/bar"));
            ok(!contains("/foo/bar", "c:/foo/bar"));
            ok(!contains("/foo/bar", "file:///foo/bar"));
        });

        it("url", () => {
            ok(contains("http://example.com/foo/bar", ""));
            ok(contains("http://example.com/foo/bar", "http://example.com"));
            ok(contains("http://example.com/foo/bar", "http://example.com/"));
            ok(contains("http://example.com/foo/bar", "http://example.com/foo"));
            ok(contains("http://example.com/foo/bar", "http://example.com/foo/"));
            ok(contains("http://example.com/foo/bar", "http://example.com/foo/bar"));
            ok(contains("http://example.com/foo/bar/", "http://example.com/foo/bar"));
            ok(contains("http://example.com/foo/bar/", "http://example.com/foo/bar/"));
            ok(contains("http://example.com/foo/bar", "http://example.com/foo?foo=bar"));
            ok(contains("http://example.com/foo/bar", "http://example.com/foo#baz"));
            ok(contains("http://example.com/foo/bar", "http://example.com/foo?foo=bar#baz"));
            ok(contains("http://example.com/foo/bar", "http://example.com/foo#baz?foo=bar"));
            ok(contains("http://example.com/foo/bar", "foo/bar?foo=bar"));
            ok(contains("http://example.com/foo/bar", "foo/bar#baz"));
            ok(contains("http://example.com/foo/bar", "foo/bar?foo=bar#baz"));
            ok(contains("http://example.com/foo/bar", "foo"));
            ok(contains("http://example.com/foo/bar", "bar"));
            ok(contains("http://example.com/目录/文件", "目录"));
            ok(contains("http://example.com/目录/文件", "文件"));
            ok(!contains("http://example.com/foo/bar", "/foo/bar"));
            ok(!contains("http://example.com/foo/bar", "c:/foo/bar"));
            ok(!contains("http://example.com/foo/bar", "http://example2.com/foo/bar"));
            ok(!contains("http://example.com/foo/bar", "http://example.com/bar"));
            ok(!contains("http://example.com/foo/bar", "example.com"));
            ok(!contains("http://example.com/foo/bar", "file:///foo/bar"));
        });

        it("file url", () => {
            ok(contains("file:///foo/bar", ""));
            ok(contains("file:///foo/bar", "file://"));
            ok(contains("file:///foo/bar", "file:///"));
            ok(contains("file:///foo/bar", "file:///foo"));
            ok(contains("file:///foo/bar", "file:///foo/"));
            ok(contains("file:///foo/bar", "file://localhost/foo"));
            ok(contains("file://localhost/foo/bar", "file:///foo"));
            ok(contains("file:///foo/bar", "file:///foo/bar"));
            ok(contains("file:///foo/bar/", "file:///foo/bar"));
            ok(contains("file:///foo/bar/", "file:///foo/bar/"));
            ok(contains("file:///foo/bar", "file:///foo?foo=bar"));
            ok(contains("file:///foo/bar", "file:///foo#baz"));
            ok(contains("file:///foo/bar", "file:///foo?foo=bar#baz"));
            ok(contains("file:///foo/bar", "file:///foo#baz?foo=bar"));
            ok(contains("file:///foo/bar", "foo/bar?foo=bar"));
            ok(contains("file:///foo/bar", "foo/bar#baz"));
            ok(contains("file:///foo/bar", "foo/bar?foo=bar#baz"));
            ok(contains("file:///foo/bar", "foo"));
            ok(contains("file:///foo/bar", "bar"));
            ok(contains("file:///目录/文件", "目录"));
            ok(contains("file:///目录/文件", "文件"));
            ok(!contains("file:///foo/bar", "file:///bar"));
            ok(!contains("file:///foo/bar", "file://example.com/foo"));
            ok(!contains("file:///foo/bar", "http://example.com/foo"));
            ok(!contains("file:///foo/bar", "file:///bar"));
            ok(!contains("file:///foo/bar", "/foo/bar"));
            ok(!contains("file:///foo/bar", "c:/foo/bar"));
        });

        it("relative path", () => {
            ok(contains("foo/bar", ""));
            ok(contains("foo/bar", "foo"));
            ok(contains("foo/bar", "foo/"));
            ok(contains("foo/bar", "foo/bar"));
            ok(contains("foo/bar/", "foo/bar"));
            ok(contains("foo/bar", "foo/bar/"));
            ok(contains("foo/bar?foo=bar", "foo"));
            ok(contains("foo/bar#baz", "foo"));
            ok(contains("foo/bar?foo=bar#baz", "foo"));
            ok(contains("foo/bar", "bar?foo=bar"));
            ok(contains("foo/bar", "bar#baz"));
            ok(contains("foo/bar", "bar?foo=bar#baz"));
            ok(contains("foo/bar", "bar"));
            ok(contains("目录/文件", "目录"));
            ok(contains("目录/文件", "文件"));
            ok(!contains("foo/bar", "/foo"));
            ok(!contains("foo/bar", "/bar"));
            ok(!contains("foo/bar", "c:/bar"));
            ok(!contains("foo/bar", "file:///bar"));
        });

        it("case insensitive", () => {
            ok(contains("c:/foo/bar", "C:/foo/bar", { caseInsensitive: true }));
            ok(contains("c:/foo/bar", "Foo/bar", { caseInsensitive: true }));
            ok(contains("/foo/bar", "Foo/bar", { caseInsensitive: true }));
            ok(contains("file:///foo/bar", "Foo/bar", { caseInsensitive: true }));
            ok(contains("file://example.com/foo/bar", "FILE://EXAMPLE.COM/Foo/bar", {
                caseInsensitive: true,
            }));
        });

        it("ignore file protocol", () => {
            ok(contains("file:///foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("file://localhost/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("file:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("file:c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("file:/c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("/foo/bar", "file:///foo/bar", { ignoreFileProtocol: true }));
            ok(contains("/foo/bar", "file://localhost/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("/foo/bar", "file:/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("c:/foo/bar", "file:///c:/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("c:/foo/bar", "file:/c:/foo/bar", { ignoreFileProtocol: true }));
            ok(contains("c:/foo/bar", "file:c:/foo/bar", { ignoreFileProtocol: true }));
            ok(!contains("file:///foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(!contains("file:///c:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
        });
    });

    describe("startsWith", () => {
        it("windows path", () => {
            ok(startsWith("c:/foo/bar", ""));
            ok(startsWith("c:/foo/bar", "c:"));
            ok(startsWith("c:/foo/bar", "c:/"));
            ok(startsWith("c:/foo/bar", "c:\\"));
            ok(startsWith("c:/foo/bar", "c:/foo/bar"));
            ok(startsWith("c:/foo/bar/", "c:/foo/bar"));
            ok(startsWith("c:/foo/bar", "c:/foo/bar/"));
            ok(startsWith("c:/foo/bar/", "C:/foo/bar"));
            ok(startsWith("c:/foo/bar", "C:/foo/bar/"));
            ok(startsWith("C:/foo/bar/", "c:/foo/bar"));
            ok(startsWith("C:/foo/bar", "c:/foo/bar/"));
            ok(startsWith("c:/foo/bar", "c:/foo"));
            ok(startsWith("c:/foo/bar/", "c:/foo/"));
            ok(startsWith("c:/foo/bar?foo=bar", "c:/foo"));
            ok(startsWith("c:/foo/bar#baz", "c:/foo"));
            ok(startsWith("c:/foo/bar", "c:/foo?foo=bar"));
            ok(startsWith("c:/foo/bar", "c:/foo#baz"));
            ok(!startsWith("c:/foo/bar", "c:/bar"));
            ok(!startsWith("c:/foo/bar", "foo"));
            ok(!startsWith("c:/foo/bar", "/foo/bar"));
            ok(!startsWith("c:/foo/bar", "file:///c:/foo/bar"));
        });

        it("posix path", () => {
            ok(startsWith("/foo/bar", ""));
            ok(startsWith("/foo/bar", "/"));
            ok(startsWith("/foo/bar", "/foo"));
            ok(startsWith("/foo/bar", "/foo/"));
            ok(startsWith("/foo/bar", "/foo/bar"));
            ok(startsWith("/foo/bar/", "/foo/bar"));
            ok(startsWith("/foo/bar/", "/foo/bar/"));
            ok(startsWith("/foo/bar", "/foo?foo=bar"));
            ok(startsWith("/foo/bar", "/foo#baz"));
            ok(startsWith("/foo/bar", "/foo?foo=bar#baz"));
            ok(!startsWith("/foo/bar", "foo"));
            ok(!startsWith("/foo/bar", "c:/foo/bar"));
            ok(!startsWith("/foo/bar", "file:///foo/bar"));
        });

        it("url", () => {
            ok(startsWith("http://example.com/foo/bar", ""));
            ok(startsWith("http://example.com/foo/bar", "http://example.com"));
            ok(startsWith("http://example.com/foo/bar", "http://example.com/"));
            ok(startsWith("http://example.com/foo/bar", "http://example.com/foo"));
            ok(startsWith("http://example.com/foo/bar", "http://example.com/foo/"));
            ok(startsWith("http://example.com/foo/bar", "http://example.com/foo/bar"));
            ok(startsWith("http://example.com/foo/bar/", "http://example.com/foo/bar"));
            ok(startsWith("http://example.com/foo/bar", "http://example.com/foo/bar/"));
            ok(startsWith("http://example.com/foo/bar/", "http://example.com/foo/bar/"));
            ok(startsWith("http://example.com/foo/bar?foo=bar", "http://example.com/foo"));
            ok(startsWith("http://example.com/foo/bar#baz", "http://example.com/foo"));
            ok(startsWith("http://example.com/foo/bar", "http://example.com/foo?foo=bar"));
            ok(startsWith("http://example.com/foo/bar", "http://example.com/foo#baz"));
            ok(!startsWith("http://example.com/foo/bar", "http://example.com/bar"));
            ok(!startsWith("http://example.com/foo/bar", "http://example2.com/foo"));
            ok(!startsWith("http://example.com/foo/bar", "file:///foo/bar"));
        });

        it("file url", () => {
            ok(startsWith("file:///foo/bar", ""));
            ok(startsWith("file:///foo/bar", "file://"));
            ok(startsWith("file:///foo/bar", "file:///"));
            ok(startsWith("file:///foo/bar", "file:///foo"));
            ok(startsWith("file:///foo/bar", "file:///foo/"));
            ok(startsWith("file:///foo/bar", "file://localhost/foo"));
            ok(startsWith("file://localhost/foo/bar", "file:///foo"));
            ok(startsWith("file:///foo/bar", "file:///foo/bar"));
            ok(startsWith("file:///foo/bar/", "file:///foo/bar"));
            ok(startsWith("file:///foo/bar", "file:///foo/bar/"));
            ok(startsWith("file:///foo/bar/", "file:///foo/bar/"));
            ok(startsWith("file:///foo/bar?foo=bar", "file:///foo"));
            ok(startsWith("file:///foo/bar#baz", "file:///foo"));
            ok(startsWith("file:///foo/bar", "file:///foo?foo=bar"));
            ok(startsWith("file:///foo/bar", "file:///foo#baz"));
            ok(!startsWith("file:///foo/bar", "file:///bar"));
            ok(!startsWith("file:///foo/bar", "file://example.com/foo"));
            ok(!startsWith("file://example.com/foo/bar", "http://example.com/foo"));
            ok(startsWith("file:///C:/Windows/System32", "file:///c:/Windows"));
        });

        it("relative path", () => {
            ok(startsWith("foo/bar", ""));
            ok(startsWith("foo/bar", "foo"));
            ok(startsWith("foo/bar", "foo/"));
            ok(startsWith("foo/bar", "foo/bar"));
            ok(startsWith("foo/bar/", "foo/bar"));
            ok(startsWith("foo/bar", "foo/bar/"));
            ok(startsWith("foo/bar?foo=bar", "foo"));
            ok(startsWith("foo/bar#baz", "foo"));
            ok(startsWith("foo/bar", "foo?foo=bar"));
            ok(startsWith("foo/bar", "foo#baz"));
            ok(!startsWith("foo/bar", "bar"));
            ok(!startsWith("foo/bar", "/bar"));
            ok(!startsWith("foo/bar", "file:///bar"));
        });

        it("case insensitive", () => {
            ok(startsWith("c:/foo/bar", "C:/foo/bar", { caseInsensitive: true }));
            ok(startsWith("c:/foo/bar", "C:/Foo", { caseInsensitive: true }));
            ok(startsWith("/foo/bar", "/Foo", { caseInsensitive: true }));
            ok(startsWith("file:///foo/bar", "FILE:///Foo", { caseInsensitive: true }));
            ok(startsWith("file://example.com/foo/bar", "FILE://EXAMPLE.COM/Foo/bar", {
                caseInsensitive: true,
            }));
        });

        it("ignore file protocol", () => {
            ok(startsWith("file:///foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("file://localhost/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("file:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("file:c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("file:/c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("/foo/bar", "file:///foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("/foo/bar", "file://localhost/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("/foo/bar", "file:/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("c:/foo/bar", "file:///c:/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("c:/foo/bar", "file:/c:/foo/bar", { ignoreFileProtocol: true }));
            ok(startsWith("c:/foo/bar", "file:c:/foo/bar", { ignoreFileProtocol: true }));
            ok(!startsWith("file:///foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(!startsWith("file:///c:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
        });
    });

    describe("endsWith", () => {
        it("windows path", () => {
            ok(endsWith("c:/foo/bar", ""));
            ok(endsWith("c:/foo/bar", "bar"));
            ok(endsWith("c:/foo/bar", "c:/foo/bar"));
            ok(endsWith("c:/foo/bar/", "c:/foo/bar"));
            ok(endsWith("c:/foo/bar", "c:/foo/bar/"));
            ok(endsWith("c:/foo/bar/", "C:/foo/bar"));
            ok(endsWith("c:/foo/bar", "C:/foo/bar/"));
            ok(endsWith("C:/foo/bar/", "c:/foo/bar"));
            ok(endsWith("C:/foo/bar", "c:/foo/bar/"));
            ok(endsWith("c:/foo/bar", "foo/bar"));
            ok(endsWith("c:/foo/bar/", "foo/bar"));
            ok(endsWith("c:/foo/bar?foo=bar", "foo/bar"));
            ok(endsWith("c:/foo/bar#baz", "foo/bar"));
            ok(endsWith("c:/foo/bar", "c:/foo/bar?foo=bar"));
            ok(endsWith("c:/foo/bar", "c:/foo/bar#baz"));
            ok(endsWith("c:/目录/文件", "目录/文件"));
            ok(endsWith("c:/目录/文件", "文件"));
            ok(!endsWith("c:/foo/bar", "c:/bar"));
            ok(!endsWith("c:/foo/bar", "/bar"));
            ok(!endsWith("c:/foo/bar", "file:///bar"));
        });

        it("posix path", () => {
            ok(endsWith("c:/foo/bar", ""));
            ok(endsWith("/foo/bar", "bar"));
            ok(endsWith("/foo/bar", "foo/bar"));
            ok(endsWith("/foo/bar/", "foo/bar"));
            ok(endsWith("/foo/bar", "/foo/bar/"));
            ok(endsWith("/foo/bar?foo=bar", "foo/bar"));
            ok(endsWith("/foo/bar#baz", "foo/bar"));
            ok(endsWith("/foo/bar", "/foo/bar?foo=bar"));
            ok(endsWith("/foo/bar", "/foo/bar#baz"));
            ok(endsWith("/目录/文件", "目录/文件"));
            ok(endsWith("/目录/文件", "文件"));
            ok(!endsWith("/foo/bar", "/bar"));
            ok(!endsWith("/foo/bar", "c:/bar"));
            ok(!endsWith("/foo/bar", "file:///bar"));
        });

        it("url", () => {
            ok(endsWith("http://example.com/foo/bar", ""));
            ok(endsWith("http://example.com/foo/bar", "bar"));
            ok(endsWith("http://example.com/foo/bar", "foo/bar"));
            ok(endsWith("http://example.com/foo/bar?foo=bar#baz", "foo/bar"));
            ok(endsWith("http://example.com/foo/bar", "foo/bar?foo=bar"));
            ok(endsWith("http://example.com/foo/bar", "foo/bar?foo=bar#baz"));
            ok(endsWith("http://example.com/foo/bar", "foo/bar#baz"));
            ok(endsWith("http://example.com/foo/bar", "http://example.com/foo/bar"));
            ok(endsWith("http://example.com/foo/bar", "http://example.com/foo/bar/"));
            ok(endsWith("http://example.com/foo/bar", "http://example.com/foo/bar?foo=bar"));
            ok(endsWith("http://example.com/foo/bar", "http://example.com/foo/bar#baz"));
            ok(endsWith("http://example.com/foo/bar", "http://example.com/foo/bar?foo=bar#baz"));
            ok(endsWith("http://example.com/目录/文件", "目录/文件"));
            ok(endsWith("http://example.com/目录/文件", "文件"));
            ok(!endsWith("http://example.com/foo/bar", "/bar"));
            ok(!endsWith("http://example.com/foo/bar", "c:/bar"));
            ok(!endsWith("http://example.com/foo/bar", "file:///bar"));
        });

        it("file url", () => {
            ok(endsWith("file:///foo/bar", ""));
            ok(endsWith("file:///foo/bar", "bar"));
            ok(endsWith("file:///foo/bar", "foo/bar"));
            ok(endsWith("file:///foo/bar/", "foo/bar"));
            ok(endsWith("file:///foo/bar?foo=bar", "foo/bar"));
            ok(endsWith("file:///foo/bar#baz", "foo/bar"));
            ok(endsWith("file:///foo/bar", "bar?foo=bar"));
            ok(endsWith("file:///foo/bar", "bar#baz"));
            ok(endsWith("file:///foo/bar", "bar?foo=bar#baz"));
            ok(endsWith("file:///foo/bar", "file:///foo/bar"));
            ok(endsWith("file:///foo/bar", "file:/foo/bar"));
            ok(endsWith("file:/foo/bar", "file:///foo/bar"));
            ok(endsWith("file:///foo/bar", "file:///foo/bar?foo=bar"));
            ok(endsWith("file:///foo/bar", "file:///foo/bar#baz"));
            ok(endsWith("file:///foo/bar", "file:///foo/bar?foo=bar#baz"));
            ok(endsWith("file:///目录/文件", "目录/文件"));
            ok(endsWith("file:///目录/文件", "文件"));
            ok(!endsWith("file:///foo/bar", "/bar"));
            ok(!endsWith("file:///foo/bar", "c:/bar"));
            ok(!endsWith("file:///foo/bar", "file:///bar"));
        });

        it("relative path", () => {
            ok(endsWith("foo/bar", ""));
            ok(endsWith("foo/bar", "bar"));
            ok(endsWith("foo/bar", "bar?foo=bar"));
            ok(endsWith("foo/bar", "bar#baz"));
            ok(endsWith("foo/bar", "bar?foo=bar#baz"));
            ok(endsWith("foo/bar", "foo/bar"));
            ok(endsWith("foo/bar/", "foo/bar"));
            ok(endsWith("foo/bar?foo=bar", "foo/bar"));
            ok(endsWith("foo/bar#baz", "foo/bar"));
            ok(endsWith("foo/bar?foo=bar#baz", "foo/bar"));
            ok(endsWith("foo/bar?foo=bar", "foo/bar#baz"));
            ok(endsWith("目录/文件", "目录/文件"));
            ok(endsWith("目录/文件", "文件"));
            ok(!endsWith("foo/bar", "/bar"));
            ok(!endsWith("foo/bar", "c:/bar"));
            ok(!endsWith("foo/bar", "file:///bar"));
        });

        it("case insensitive", () => {
            ok(endsWith("c:/foo/bar", "C:/foo/bar", { caseInsensitive: true }));
            ok(endsWith("c:/foo/bar", "Foo/bar", { caseInsensitive: true }));
            ok(endsWith("/foo/bar", "Foo/bar", { caseInsensitive: true }));
            ok(endsWith("file:///foo/bar", "Foo/bar", { caseInsensitive: true }));
            ok(endsWith("file://example.com/foo/bar", "FILE://EXAMPLE.COM/Foo/bar", {
                caseInsensitive: true,
            }));
        });

        it("ignore file protocol", () => {
            ok(endsWith("file:///foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("file://localhost/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("file:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("file:c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("file:/c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("/foo/bar", "file:///foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("/foo/bar", "file://localhost/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("/foo/bar", "file:/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("c:/foo/bar", "file:///c:/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("c:/foo/bar", "file:/c:/foo/bar", { ignoreFileProtocol: true }));
            ok(endsWith("c:/foo/bar", "file:c:/foo/bar", { ignoreFileProtocol: true }));
            ok(!endsWith("file:///foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(!endsWith("file:///c:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
        });
    });

    describe("equals", () => {
        it("windows path", () => {
            ok(equals("c:/foo/bar", "c:/foo/bar"));
            ok(equals("c:/foo/bar", "c:/foo/bar/"));
            ok(equals("c:/foo/bar/", "c:/foo/bar"));
            ok(equals("c:/foo/bar/", "c:/foo/bar/"));
            ok(equals("c:/foo/bar?foo=bar", "c:/foo/bar"));
            ok(equals("c:/foo/bar#baz", "c:/foo/bar"));
            ok(equals("c:/foo/bar?foo=bar#baz", "c:/foo/bar"));
            ok(equals("c:/foo/bar", "c:/foo/bar?foo=bar"));
            ok(equals("c:/foo/bar", "c:/foo/bar#baz"));
            ok(equals("c:/foo/bar", "c:/foo/bar?foo=bar#baz"));
            ok(equals("c:/目录/文件", "c:/目录/文件"));
            ok(!equals("c:/foo/bar", "foo"));
            ok(!equals("c:/foo/bar", "bar"));
            ok(!equals("c:/foo/bar", "c:/bar"));
            ok(!equals("c:/foo/bar", "/foo/bar"));
            ok(!equals("c:/foo/bar", "file:///c:/foo/bar"));
            ok(!equals("c:/foo/bar", "c:/"));
            ok(!equals("c:/foo/bar", "c:\\"));
            ok(!equals("c:/foo/bar", ""));
        });

        it("posix path", () => {
            ok(equals("/foo/bar", "/foo/bar"));
            ok(equals("/foo/bar", "/foo/bar/"));
            ok(equals("/foo/bar/", "/foo/bar"));
            ok(equals("/foo/bar/", "/foo/bar/"));
            ok(equals("/foo/bar", "/foo/bar?foo=bar"));
            ok(equals("/foo/bar", "/foo/bar#baz"));
            ok(equals("/foo/bar", "/foo/bar?foo=bar#baz"));
            ok(equals("/foo/bar?foo=bar", "/foo/bar"));
            ok(equals("/foo/bar#baz", "/foo/bar"));
            ok(equals("/foo/bar?foo=bar#baz", "/foo/bar"));
            ok(equals("/目录/文件", "/目录/文件"));
            ok(!equals("/foo/bar", "foo"));
            ok(!equals("/foo/bar", "bar"));
            ok(!equals("/foo/bar", "/bar"));
            ok(!equals("/foo/bar", "c:/foo/bar"));
            ok(!equals("/foo/bar", "file:///foo/bar"));
            ok(!equals("/foo/bar", ""));
        });

        it("url", () => {
            ok(equals("http://example.com/foo/bar", "http://example.com/foo/bar"));
            ok(equals("http://example.com/foo/bar", "http://example.com/foo/bar/"));
            ok(equals("http://example.com/foo/bar/", "http://example.com/foo/bar"));
            ok(equals("http://example.com/foo/bar/", "http://example.com/foo/bar/"));
            ok(equals("http://example.com/foo/bar", "http://example.com/foo/bar?foo=bar"));
            ok(equals("http://example.com/foo/bar", "http://example.com/foo/bar#baz"));
            ok(equals("http://example.com/foo/bar", "http://example.com/foo/bar?foo=bar#baz"));
            ok(equals("http://example.com/foo/bar?foo=bar", "http://example.com/foo/bar"));
            ok(equals("http://example.com/foo/bar#baz", "http://example.com/foo/bar"));
            ok(equals("http://example.com/foo/bar?foo=bar#baz", "http://example.com/foo/bar"));
            ok(equals("http://example.com/目录/文件", "http://example.com/目录/文件"));
            ok(!equals("http://example.com/foo/bar", "foo/bar?foo=bar"));
            ok(!equals("http://example.com/foo/bar", "foo/bar#baz"));
            ok(!equals("http://example.com/foo/bar", "foo/bar?foo=bar#baz"));
            ok(!equals("http://example.com/foo/bar", "foo"));
            ok(!equals("http://example.com/foo/bar", "bar"));
            ok(!equals("http://example.com/foo/bar", "/foo/bar"));
            ok(!equals("http://example.com/foo/bar", "c:/foo/bar"));
            ok(!equals("http://example.com/foo/bar", "http://example2.com/foo/bar"));
            ok(!equals("http://example.com/foo/bar", "http://example.com/bar"));
            ok(!equals("http://example.com/foo/bar", "example.com"));
            ok(!equals("http://example.com/foo/bar", "file:///foo/bar"));
            ok(!equals("http://example.com/foo/bar", ""));
        });

        it("file url", () => {
            ok(equals("file:///foo/bar", "file:///foo/bar"));
            ok(equals("file:///foo/bar", "file:///foo/bar/"));
            ok(equals("file:///foo/bar/", "file://localhost/foo/bar"));
            ok(equals("file://localhost/foo/bar", "file:///foo/bar"));
            ok(equals("file:///foo/bar", "file://localhost/foo/bar"));
            ok(equals("file://localhost/foo/bar", "file://localhost/foo/bar"));
            ok(equals("file:///foo/bar", "file:///foo/bar"));
            ok(equals("file:///foo/bar/", "file:///foo/bar"));
            ok(equals("file:///foo/bar/", "file:///foo/bar/"));
            ok(equals("file:///foo/bar", "file:///foo/bar?foo=bar"));
            ok(equals("file:///foo/bar", "file:///foo/bar#baz"));
            ok(equals("file:///foo/bar", "file:///foo/bar?foo=bar#baz"));
            ok(equals("file:///foo/bar?foo=bar", "file:///foo/bar"));
            ok(equals("file:///foo/bar#baz", "file:///foo/bar"));
            ok(equals("file:///foo/bar?foo=bar#baz", "file:///foo/bar"));
            ok(equals("file:///目录/文件", "file:///目录/文件"));
            ok(!equals("file:///foo/bar", "foo"));
            ok(!equals("file:///foo/bar", "bar"));
            ok(!equals("file:///foo/bar", "file://"));
            ok(!equals("file:///foo/bar", "file:///"));
            ok(!equals("file:///foo/bar", "file:///bar"));
            ok(!equals("file:///foo/bar", "file://example.com/foo"));
            ok(!equals("file:///foo/bar", "http://example.com/foo"));
            ok(!equals("file:///foo/bar", "file:///bar"));
            ok(!equals("file:///foo/bar", "/foo/bar"));
            ok(!equals("file:///foo/bar", "c:/foo/bar"));
            ok(!equals("file:///foo/bar", ""));
        });

        it("relative path", () => {
            ok(equals("foo/bar", "foo/bar"));
            ok(equals("foo/bar", "foo/bar/"));
            ok(equals("foo/bar/", "foo/bar"));
            ok(equals("foo/bar?foo=bar", "foo/bar"));
            ok(equals("foo/bar#baz", "foo/bar"));
            ok(equals("foo/bar?foo=bar#baz", "foo/bar"));
            ok(equals("foo/bar", "foo/bar?foo=bar"));
            ok(equals("foo/bar", "foo/bar#baz"));
            ok(equals("foo/bar", "foo/bar?foo=bar#baz"));
            ok(equals("目录/文件", "目录/文件"));
            ok(!equals("foo/bar", "bar"));
            ok(!equals("foo/bar", "/foo/bar"));
            ok(!equals("foo/bar", "/bar"));
            ok(!equals("foo/bar", "c:/bar"));
            ok(!equals("foo/bar", "file:///foo/bar"));
            ok(!equals("foo/bar", ""));
        });

        it("case insensitive", () => {
            ok(equals("c:/foo/bar", "C:/foo/bar", { caseInsensitive: true }));
            ok(equals("c:/foo/bar", "C:/Foo/bar", { caseInsensitive: true }));
            ok(equals("/foo/bar", "/Foo/bar", { caseInsensitive: true }));
            ok(equals("file://example.com/foo/bar", "FILE://EXAMPLE.COM/Foo/bar", {
                caseInsensitive: true,
            }));
        });

        it("ignore file protocol", () => {
            ok(equals("file:///foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("file://localhost/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("file:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("file:c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("file:/c:/foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("/foo/bar", "file:///foo/bar", { ignoreFileProtocol: true }));
            ok(equals("/foo/bar", "file://localhost/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("/foo/bar", "file:/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("c:/foo/bar", "file:///c:/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("c:/foo/bar", "file:/c:/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("c:/foo/bar", "file:c:/foo/bar", { ignoreFileProtocol: true }));
            ok(equals("c:/目录/文件", "file:///c:/目录/文件", { ignoreFileProtocol: true }));
            ok(!equals("file:///foo/bar", "c:/foo/bar", { ignoreFileProtocol: true }));
            ok(!equals("file:///c:/foo/bar", "/foo/bar", { ignoreFileProtocol: true }));
        });
    });

    describe("join", () => {
        it("windows path", () => {
            strictEqual(join("c:"), "c:\\");
            strictEqual(join("c:/"), "c:\\");
            strictEqual(join("c:\\"), "c:\\");
            strictEqual(join("c:", "foo"), "c:\\foo");
            strictEqual(join("c:", "foo", "bar"), "c:\\foo\\bar");
            strictEqual(join("c:", "foo", "bar", "baz"), "c:\\foo\\bar\\baz");
            strictEqual(join("c:", "foo", "bar", "..", "baz"), "c:\\foo\\baz");
            strictEqual(join("c:", "foo", "bar", "..\\baz"), "c:\\foo\\baz");
            strictEqual(join("c:\\", "foo", "bar", "..", "baz"), "c:\\foo\\baz");
            strictEqual(join("c://", "foo", "bar", "..", "baz"), "c:\\foo\\baz");
            strictEqual(join("c:/foo", "bar", "?foo=bar", "#baz"), "c:\\foo\\bar?foo=bar#baz");
            strictEqual(join("c:\\foo", "bar", "?foo=bar", "#baz"), "c:\\foo\\bar?foo=bar#baz");
            strictEqual(join("c:\\", "目录", "文件"), "c:\\目录\\文件");
        });

        it("posix path", () => {
            strictEqual(join("/"), "/");
            strictEqual(join("/", "foo"), "/foo");
            strictEqual(join("/", "foo", "bar"), "/foo/bar");
            strictEqual(join("/", "foo", "bar", "baz"), "/foo/bar/baz");
            strictEqual(join("/", "foo", "bar", "..", "baz"), "/foo/baz");
            strictEqual(join("/", "foo", "bar", "../baz"), "/foo/baz");
            strictEqual(join("/", "foo", "bar", "?foo=bar", "#baz"), "/foo/bar?foo=bar#baz");
            strictEqual(join("/", "目录", "文件"), "/目录/文件");
        });

        it("url", () => {
            strictEqual(join("http://example.com"), "http://example.com");
            strictEqual(join("http://example.com", "foo"), "http://example.com/foo");
            strictEqual(join("http://example.com", "foo", "bar"), "http://example.com/foo/bar");
            strictEqual(join("http://example.com", "?foo=bar"), "http://example.com?foo=bar");
            strictEqual(join("http://example.com", "#baz"), "http://example.com#baz");
            strictEqual(
                join("http://example.com", "foo", "bar", "?foo=bar"),
                "http://example.com/foo/bar?foo=bar"
            );
            strictEqual(
                join("http://example.com", "foo", "bar", "#baz"),
                "http://example.com/foo/bar#baz"
            );
            strictEqual(
                join("http://example.com", "foo", "bar", "?foo=bar", "#baz"),
                "http://example.com/foo/bar?foo=bar#baz"
            );
            strictEqual(join("http://example.com", "foo", "..", "bar"), "http://example.com/bar");
            strictEqual(join("http://example.com", "foo", "../bar"), "http://example.com/bar");
            strictEqual(
                join("http://example.com", "foo", "../bar?foo=bar"),
                "http://example.com/bar?foo=bar"
            );
            strictEqual(
                join("http://example.com", "foo", "../bar#baz"),
                "http://example.com/bar#baz"
            );
            strictEqual(
                join("http://example.com", "foo", "../bar?foo=bar#baz"),
                "http://example.com/bar?foo=bar#baz"
            );
            strictEqual(
                join("http://example.com/foo/../bar", "?foo=bar#baz"),
                "http://example.com/bar?foo=bar#baz"
            );
            strictEqual(join("http://example.com", "目录", "文件"), "http://example.com/目录/文件");
        });

        it("file url", () => {
            strictEqual(join("file:"), "file:///");
            strictEqual(join("file:/"), "file:///");
            strictEqual(join("file://"), "file:///");
            strictEqual(join("file:///"), "file:///");
            strictEqual(join("file://", "foo"), "file:///foo");
            strictEqual(join("file:///", "foo"), "file:///foo");
            strictEqual(join("file://", "foo", "bar"), "file:///foo/bar");
            strictEqual(
                join("file://", "foo", "bar", "?foo=bar", "#baz"),
                "file:///foo/bar?foo=bar#baz"
            );
            strictEqual(join("file://localhost", "foo", "bar"), "file:///foo/bar");
            strictEqual(join("file://example.com", "foo", "bar"), "file://example.com/foo/bar");
            strictEqual(join("file:/foo", "bar"), "file:///foo/bar");
            strictEqual(join("file:///foo", "bar", "../.."), "file:///");
            strictEqual(join("file:///c:/foo", "bar", "../.."), "file:///c:/");
            strictEqual(join("file:///c:/", "foo", "bar"), "file:///c:/foo/bar");
            strictEqual(join("file:///c:/", "目录", "文件"), "file:///c:/目录/文件");
        });

        it("relative path", () => {
            strictEqual(join(), ".");
            strictEqual(join(""), ".");
            strictEqual(join("", ""), ".");
            strictEqual(join("foo"), "foo");
            strictEqual(join("foo", "bar"), path.join("foo", "bar"));
            strictEqual(join("foo", "bar", "baz"), path.join("foo", "bar", "baz"));
            strictEqual(join("foo", "bar", "..", "baz"), path.join(join("foo", "baz")));
            strictEqual(join("foo", "bar", "../baz"), path.join("foo", "baz"));
            strictEqual(
                join("foo", "bar", "?foo=bar", "#baz"),
                path.join("foo", "bar") + "?foo=bar#baz"
            );
            strictEqual(join("目录", "文件"), path.join("目录", "文件"));
        });
    });

    describe("normalize", () => {
        it("windows path", () => {
            strictEqual(normalize("c:/foo/../bar"), "c:\\bar");
            strictEqual(normalize("c:/foo/bar/.."), "c:\\foo");
            strictEqual(normalize("c:/foo/bar/../"), "c:\\foo");
            strictEqual(normalize("c:/foo/.."), "c:\\");
            strictEqual(normalize("c:/foo/../.."), "c:\\");
            strictEqual(normalize("c:/"), "c:\\");
            strictEqual(normalize("c:"), "c:\\");
            strictEqual(normalize("c:/foo/./bar"), "c:\\foo\\bar");
            strictEqual(normalize("c:/foo/././/bar"), "c:\\foo\\bar");
            strictEqual(normalize("c:/foo/bar/..?foo=bar"), "c:\\foo?foo=bar");
            strictEqual(normalize("c:/foo/bar/..#baz"), "c:\\foo#baz");
            strictEqual(normalize("c:/foo/bar/..?foo=bar#baz"), "c:\\foo?foo=bar#baz");
        });

        it("posix path", () => {
            strictEqual(normalize("/foo/../bar"), "/bar");
            strictEqual(normalize("/foo/bar/.."), "/foo");
            strictEqual(normalize("/foo/bar/../"), "/foo");
            strictEqual(normalize("/foo/.."), "/");
            strictEqual(normalize("/foo/../.."), "/");
            strictEqual(normalize("/foo/./bar"), "/foo/bar");
            strictEqual(normalize("/foo/././bar"), "/foo/bar");
            strictEqual(normalize("/foo/bar/..?foo=bar"), "/foo?foo=bar");
            strictEqual(normalize("/foo/bar/..#baz"), "/foo#baz");
            strictEqual(normalize("/foo/bar/..?foo=bar#baz"), "/foo?foo=bar#baz");
        });

        it("url", () => {
            strictEqual(
                normalize("http://example.com/foo/../bar?foo=bar#baz"),
                "http://example.com/bar?foo=bar#baz"
            );
            strictEqual(
                normalize("http://example.com/foo/bar/..?foo=bar#baz"),
                "http://example.com/foo?foo=bar#baz"
            );
            strictEqual(
                normalize("http://example.com/foo/bar/../?foo=bar#baz"),
                "http://example.com/foo?foo=bar#baz"
            );
            strictEqual(
                normalize("http://example.com/foo/../../?foo=bar#baz"),
                "http://example.com?foo=bar#baz"
            );
            strictEqual(
                normalize("http://example.com/foo/./bar"),
                "http://example.com/foo/bar"
            );
            strictEqual(
                normalize("http://example.com/foo/.."),
                "http://example.com"
            );
            strictEqual(
                normalize("http://example.com/foo/../.."),
                "http://example.com"
            );
        });

        it("file url", () => {
            strictEqual(normalize("file:///foo/../bar"), "file:///bar");
            strictEqual(normalize("file:///foo/bar/.."), "file:///foo");
            strictEqual(normalize("file:///foo/bar/../"), "file:///foo");
            strictEqual(normalize("file:///foo/.."), "file:///");
            strictEqual(normalize("file:///foo/../.."), "file:///");
            strictEqual(normalize("file:///foo/./bar"), "file:///foo/bar");
            strictEqual(normalize("file:///foo/././/bar"), "file:///foo/bar");
            strictEqual(normalize("file:///foo/bar/..?foo=bar"), "file:///foo?foo=bar");
            strictEqual(normalize("file:///foo/bar/..#baz"), "file:///foo#baz");
            strictEqual(normalize("file:///foo/bar/..?foo=bar#baz"), "file:///foo?foo=bar#baz");
            strictEqual(normalize("file:/foo/bar/..?foo=bar#baz"), "file:///foo?foo=bar#baz");
        });

        it("relative path", () => {
            strictEqual(normalize("foo/../bar"), "bar");
            strictEqual(normalize("foo\\..\\bar"), "bar");
            strictEqual(normalize("foo/bar/.."), "foo");
            strictEqual(normalize("foo\\bar\\.."), "foo");
            strictEqual(normalize("foo/bar/../"), "foo");
            strictEqual(normalize("foo\\bar\\..\\"), "foo");
            strictEqual(normalize("foo/.."), ".");
            strictEqual(normalize("foo\\.."), ".");
            strictEqual(normalize("foo/../.."), "..");
            strictEqual(normalize("foo\\..\\.."), "..");
            strictEqual(normalize("foo/./bar"), path.join("foo", "bar"));
            strictEqual(normalize("foo\\.\\bar"), path.join("foo", "bar"));
            strictEqual(normalize(""), ".");
            strictEqual(normalize("."), ".");
            strictEqual(normalize(".."), "..");
            strictEqual(normalize("../foo"), path.normalize("../foo"));
            strictEqual(normalize("../.."), path.normalize("../.."));
            strictEqual(normalize("../../foo"), path.normalize("../../foo"));
            strictEqual(normalize("foo/../bar?foo=bar"), "bar?foo=bar");
            strictEqual(normalize("foo/../bar#baz"), "bar#baz");
            strictEqual(normalize("foo/../bar?foo=bar#baz"), "bar?foo=bar#baz");
        });
    });

    describe("sanitize", () => {
        it("windows path", () => {
            strictEqual(sanitize("c:/foo/../bar"), "c:\\bar");
            strictEqual(sanitize("c:/foo/bar/.."), "c:\\foo");
            strictEqual(sanitize("c:/foo/bar/../"), "c:\\foo");
            strictEqual(sanitize("c:/foo/.."), "c:\\");
            strictEqual(sanitize("c:/foo/../.."), "c:\\");
            strictEqual(sanitize("c:/"), "c:\\");
            strictEqual(sanitize("c:"), "c:\\");
            strictEqual(sanitize("c:/foo/./bar"), "c:\\foo\\bar");
            strictEqual(sanitize("c:/foo/././/bar"), "c:\\foo\\bar");
            strictEqual(sanitize("c:/foo/bar/..?foo=bar"), "c:\\foo");
            strictEqual(sanitize("c:/foo/bar/..#baz"), "c:\\foo");
            strictEqual(sanitize("c:/foo/bar/..?foo=bar#baz"), "c:\\foo");
        });

        it("posix path", () => {
            strictEqual(sanitize("/foo/../bar"), "/bar");
            strictEqual(sanitize("/foo/bar/.."), "/foo");
            strictEqual(sanitize("/foo/bar/../"), "/foo");
            strictEqual(sanitize("/foo/.."), "/");
            strictEqual(sanitize("/foo/../.."), "/");
            strictEqual(sanitize("/foo/./bar"), "/foo/bar");
            strictEqual(sanitize("/foo/././bar"), "/foo/bar");
            strictEqual(sanitize("/foo/bar/..?foo=bar"), "/foo");
            strictEqual(sanitize("/foo/bar/..#baz"), "/foo");
            strictEqual(sanitize("/foo/bar/..?foo=bar#baz"), "/foo");
        });

        it("url", () => {
            strictEqual(
                sanitize("http://example.com/foo/../bar?foo=bar#baz"),
                "http://example.com/bar"
            );
            strictEqual(
                sanitize("http://example.com/foo/bar/..?foo=bar#baz"),
                "http://example.com/foo"
            );
            strictEqual(
                sanitize("http://example.com/foo/bar/../?foo=bar#baz"),
                "http://example.com/foo"
            );
            strictEqual(
                sanitize("http://example.com/foo/../../?foo=bar#baz"),
                "http://example.com"
            );
            strictEqual(
                sanitize("http://example.com/foo/./bar"),
                "http://example.com/foo/bar"
            );
            strictEqual(
                sanitize("http://example.com/foo/.."),
                "http://example.com"
            );
            strictEqual(
                sanitize("http://example.com/foo/../.."),
                "http://example.com"
            );
        });

        it("file url", () => {
            strictEqual(sanitize("file:///foo/../bar"), "file:///bar");
            strictEqual(sanitize("file:///foo/bar/.."), "file:///foo");
            strictEqual(sanitize("file:///foo/bar/../"), "file:///foo");
            strictEqual(sanitize("file:///foo/.."), "file:///");
            strictEqual(sanitize("file:///foo/../.."), "file:///");
            strictEqual(sanitize("file:///foo/./bar"), "file:///foo/bar");
            strictEqual(sanitize("file:///foo/././/bar"), "file:///foo/bar");
            strictEqual(sanitize("file:///foo/bar/..?foo=bar"), "file:///foo");
            strictEqual(sanitize("file:///foo/bar/..#baz"), "file:///foo");
            strictEqual(sanitize("file:///foo/bar/..?foo=bar#baz"), "file:///foo");
            strictEqual(sanitize("file:/foo/bar/..?foo=bar#baz"), "file:///foo");
        });

        it("relative path", () => {
            strictEqual(sanitize("foo/../bar"), "bar");
            strictEqual(sanitize("foo\\..\\bar"), "bar");
            strictEqual(sanitize("foo/bar/.."), "foo");
            strictEqual(sanitize("foo\\bar\\.."), "foo");
            strictEqual(sanitize("foo/bar/../"), "foo");
            strictEqual(sanitize("foo\\bar\\..\\"), "foo");
            strictEqual(sanitize("foo/.."), ".");
            strictEqual(sanitize("foo\\.."), ".");
            strictEqual(sanitize("foo/../.."), "..");
            strictEqual(sanitize("foo\\..\\.."), "..");
            strictEqual(sanitize("foo/./bar"), path.join("foo", "bar"));
            strictEqual(sanitize("foo\\.\\bar"), path.join("foo", "bar"));
            strictEqual(sanitize(""), ".");
            strictEqual(sanitize("."), ".");
            strictEqual(sanitize(".."), "..");
            strictEqual(sanitize("../foo"), path.normalize("../foo"));
            strictEqual(sanitize("../.."), path.normalize("../.."));
            strictEqual(sanitize("../../foo"), path.normalize("../../foo"));
            strictEqual(sanitize("foo/../bar?foo=bar"), "bar");
            strictEqual(sanitize("foo/../bar#baz"), "bar");
            strictEqual(sanitize("foo/../bar?foo=bar#baz"), "bar");
        });
    });

    describe("resolve", () => {
        it("windows path", () => {
            strictEqual(resolve("c:/foo/../bar"), "c:\\bar");
            strictEqual(resolve("c:/foo", "bar"), "c:\\foo\\bar");
            strictEqual(resolve("c:/foo", "../bar"), "c:\\bar");
            strictEqual(resolve("c:/foo", "../bar", "baz"), "c:\\bar\\baz");
            strictEqual(resolve("c:/foo", "c:/foo2", "../bar"), "c:\\bar");
            strictEqual(resolve("c:/foo", "/foo", "../bar"), "/bar");
            strictEqual(resolve("c:/", "foo", "bar"), "c:\\foo\\bar");
            strictEqual(resolve("c:", "foo", "bar"), "c:\\foo\\bar");
            strictEqual(resolve("c:/"), "c:\\");
            strictEqual(resolve("c:"), "c:\\");
            strictEqual(resolve("c:/foo", "http://localhost/foo", "../bar"), "http://localhost/bar");
            strictEqual(resolve("c:/foo", "bar", "?foo=bar", "#baz"), "c:\\foo\\bar?foo=bar#baz");
        });

        it("posix path", () => {
            strictEqual(resolve("/foo/../bar"), "/bar");
            strictEqual(resolve("/foo", "bar"), "/foo/bar");
            strictEqual(resolve("/foo", "../bar"), "/bar");
            strictEqual(resolve("/foo", "../bar", "baz"), "/bar/baz");
            strictEqual(resolve("/foo", "/foo2", "../bar"), "/bar");
            strictEqual(resolve("/foo", "c:/foo", "../bar"), "c:\\bar");
            strictEqual(resolve("/foo", "http://localhost/foo", "../bar"), "http://localhost/bar");
            strictEqual(resolve("/foo", "bar", "?foo=bar", "#baz"), "/foo/bar?foo=bar#baz");
        });

        it("url", () => {
            strictEqual(
                resolve("http://example.com/foo/../bar?foo=bar#baz"),
                "http://example.com/bar?foo=bar#baz"
            );
            strictEqual(resolve("http://example.com", "foo/../bar"), "http://example.com/bar");
            strictEqual(resolve("http://example.com/foo", "./bar"), "http://example.com/foo/bar");
            strictEqual(resolve("http://example.com/foo", "../bar"), "http://example.com/bar");
            strictEqual(
                resolve("http://example.com/foo", "../bar", "?foo=bar", "#baz"),
                "http://example.com/bar?foo=bar#baz"
            );
            strictEqual(
                resolve("http://example.com/foo", "http://example2.com/foo", "../bar"),
                "http://example2.com/bar"
            );
            strictEqual(resolve("http://example.com", "/foo", "../bar"), "/bar");
            strictEqual(resolve("http://example.com", "c:/foo", "../bar"), "c:\\bar");
        });

        it("file url", () => {
            strictEqual(resolve("file:///foo/../bar"), "file:///bar");
            strictEqual(resolve("file:///foo", "bar"), "file:///foo/bar");
            strictEqual(resolve("file:///foo", "../bar"), "file:///bar");
            strictEqual(resolve("file:///foo", "../bar", "baz"), "file:///bar/baz");
            strictEqual(resolve("file:///foo", "file:///foo2", "../bar"), "file:///bar");
            strictEqual(resolve("file:///foo", "/foo", "../bar"), "/bar");
            strictEqual(resolve("file:/foo/bar", "../baz"), "file:///foo/baz");
            strictEqual(
                resolve("file:///foo", "http://localhost/foo", "../bar"),
                "http://localhost/bar"
            );
            strictEqual(
                resolve("file:///foo", "bar", "?foo=bar", "#baz"),
                "file:///foo/bar?foo=bar#baz"
            );
        });

        it("relative path", () => {
            strictEqual(resolve(), path.resolve());
            strictEqual(resolve(""), path.resolve());
            strictEqual(resolve("", ""), path.resolve());
            strictEqual(resolve("foo/../bar"), path.resolve("bar"));
            strictEqual(resolve("foo", "bar"), path.resolve("foo", "bar"));
            strictEqual(resolve("foo", "../bar"), path.resolve("foo", "../bar"));
            strictEqual(resolve("foo", "../bar", "baz"), path.resolve("foo", "../bar", "baz"));
            strictEqual(resolve("foo", "c:/foo", "../bar"), "c:\\bar");
            strictEqual(resolve("foo", "/foo", "../bar"), "/bar");
            strictEqual(resolve("foo", "http://localhost/foo", "../bar"), "http://localhost/bar");
            strictEqual(resolve("foo", "bar", "?foo=bar", "#baz"), path.resolve("foo/bar?foo=bar#baz"));
        });
    });

    describe("dirname", () => {
        it("windows path", () => {
            strictEqual(dirname("c:/foo/bar"), "c:\\foo");
            strictEqual(dirname("c:/foo/bar/"), "c:\\foo");
            strictEqual(dirname("c:/foo/../bar"), "c:\\");
            strictEqual(dirname("c:/foo/"), "c:\\");
            strictEqual(dirname("c:/foo"), "c:\\");
            strictEqual(dirname("c:/foo/bar.txt?foo=bar"), "c:\\foo");
            strictEqual(dirname("c:/foo/bar.txt#baz"), "c:\\foo");
            strictEqual(dirname("c:/foo/bar.txt?foo=bar#baz"), "c:\\foo");
        });

        it("posix path", () => {
            strictEqual(dirname("/foo/bar"), "/foo");
            strictEqual(dirname("/foo/bar/"), "/foo");
            strictEqual(dirname("/foo/../bar"), "/");
            strictEqual(dirname("/foo/"), "/");
            strictEqual(dirname("/foo"), "/");
            strictEqual(dirname("/foo/bar.txt?foo=bar"), "/foo");
            strictEqual(dirname("/foo/bar.txt#baz"), "/foo");
            strictEqual(dirname("/foo/bar.txt?foo=bar#baz"), "/foo");
        });

        it("url", () => {
            strictEqual(dirname("http://example.com/foo/bar?foo=bar#baz"), "http://example.com/foo");
            strictEqual(dirname("http://example.com/foo?foo=bar#baz"), "http://example.com");
            strictEqual(dirname("http://example.com/foo/../bar?foo=bar#baz"), "http://example.com");
            strictEqual(dirname("http://example.com/?foo=bar#baz"), "http://example.com");
            strictEqual(dirname("http://example.com?foo=bar#baz"), "http://example.com");
        });

        it("file url", () => {
            strictEqual(dirname("file:///foo/bar"), "file:///foo");
            strictEqual(dirname("file:///foo/bar/"), "file:///foo");
            strictEqual(dirname("file:///foo/../bar"), "file:///");
            strictEqual(dirname("file:///foo/"), "file:///");
            strictEqual(dirname("file:///foo"), "file:///");
            strictEqual(dirname("file:///foo/bar.txt?foo=bar"), "file:///foo");
            strictEqual(dirname("file:///foo/bar.txt#baz"), "file:///foo");
            strictEqual(dirname("file:///foo/bar.txt?foo=bar#baz"), "file:///foo");
            strictEqual(dirname("file:/foo/bar"), "file:///foo");
        });

        it("relative path", () => {
            strictEqual(dirname("foo/bar"), "foo");
            strictEqual(dirname("foo/bar/"), "foo");
            strictEqual(dirname("foo/bar/baz"), path.join("foo", "bar"));
            strictEqual(dirname("foo/../bar"), ".");
            strictEqual(dirname("foo/"), ".");
            strictEqual(dirname("foo"), ".");
            strictEqual(dirname(""), ".");
            strictEqual(dirname("foo/bar.txt?foo=bar"), "foo");
            strictEqual(dirname("foo/bar.txt#baz"), "foo");
            strictEqual(dirname("foo/bar.txt?foo=bar#baz"), "foo");
        });
    });

    describe("basename", () => {
        it("windows path", () => {
            strictEqual(basename("c:/foo/bar"), "bar");
            strictEqual(basename("c:/foo/bar/"), "bar");
            strictEqual(basename("c:/foo/../bar"), "bar");
            strictEqual(basename("c:/foo/"), "foo");
            strictEqual(basename("c:/foo"), "foo");
            strictEqual(basename("c:/foo.txt"), "foo.txt");
            strictEqual(basename("c:\\foo.txt"), "foo.txt");
            strictEqual(basename("c:/foo.txt", ".txt"), "foo");
            strictEqual(basename("c:/foo.txt", ".ts"), "foo.txt");
            strictEqual(basename("c:/foo.txt?foo=bar"), "foo.txt");
            strictEqual(basename("c:\\foo.txt?foo=bar"), "foo.txt");
            strictEqual(basename("c:/foo.txt#baz"), "foo.txt");
            strictEqual(basename("c:\\foo.txt#baz"), "foo.txt");
            strictEqual(basename("c:/foo.txt?foo=bar#baz"), "foo.txt");
            strictEqual(basename("c:\\foo.txt?foo=bar#baz"), "foo.txt");
            strictEqual(basename("c:/"), "");
            strictEqual(basename("c:"), "");
        });

        it("posix path", () => {
            strictEqual(basename("/foo/bar"), "bar");
            strictEqual(basename("/foo/bar/"), "bar");
            strictEqual(basename("/foo/../bar"), "bar");
            strictEqual(basename("/foo/"), "foo");
            strictEqual(basename("/foo"), "foo");
            strictEqual(basename("/"), "");
            strictEqual(basename("/foo.txt", ".txt"), "foo");
            strictEqual(basename("/foo.txt", ".ts"), "foo.txt");
            strictEqual(basename("/foo.txt?foo=bar"), "foo.txt");
            strictEqual(basename("/foo.txt#baz"), "foo.txt");
            strictEqual(basename("/foo.txt?foo=bar#baz"), "foo.txt");
        });

        it("url", () => {
            strictEqual(basename("http://example.com/foo.txt"), "foo.txt");
            strictEqual(basename("http://example.com/foo"), "foo");
            strictEqual(basename("http://example.com"), "");
            strictEqual(basename("http://example.com/foo.txt", ".txt"), "foo");
            strictEqual(basename("http://example.com/foo.txt", ".ts"), "foo.txt");
            strictEqual(basename("http://example.com/foo.txt?foo=bar"), "foo.txt");
            strictEqual(basename("http://example.com/foo.txt#baz"), "foo.txt");
            strictEqual(basename("http://example.com/foo.txt?foo=bar#baz"), "foo.txt");
            strictEqual(basename("http://example.com/foo.txt?foo=bar#baz", ".txt"), "foo");
        });

        it("file url", () => {
            strictEqual(basename("file:///foo/bar"), "bar");
            strictEqual(basename("file:///foo/bar/"), "bar");
            strictEqual(basename("file:///foo/../bar"), "bar");
            strictEqual(basename("file:///foo/"), "foo");
            strictEqual(basename("file:///foo"), "foo");
            strictEqual(basename("file:///"), "");
            strictEqual(basename("file:///foo.txt", ".txt"), "foo");
            strictEqual(basename("file:///foo.txt", ".ts"), "foo.txt");
            strictEqual(basename("file:///foo.txt?foo=bar"), "foo.txt");
            strictEqual(basename("file:///foo.txt#baz"), "foo.txt");
            strictEqual(basename("file:///foo.txt?foo=bar#baz"), "foo.txt");
            strictEqual(basename("file:///foo.txt?foo=bar#baz", ".txt"), "foo");
        });

        it("relative path", () => {
            strictEqual(basename("foo/bar"), "bar");
            strictEqual(basename("foo/bar/"), "bar");
            strictEqual(basename("foo/../bar"), "bar");
            strictEqual(basename("foo/"), "foo");
            strictEqual(basename("foo"), "foo");
            strictEqual(basename(""), "");
            strictEqual(basename("foo.txt", ".txt"), "foo");
            strictEqual(basename("foo.txt", ".ts"), "foo.txt");
            strictEqual(basename("foo.txt?foo=bar"), "foo.txt");
            strictEqual(basename("foo.txt#baz"), "foo.txt");
            strictEqual(basename("foo.txt?foo=bar#baz"), "foo.txt");
            strictEqual(basename("foo.txt?foo=bar#baz", ".txt"), "foo");
        });
    });

    describe("extname", () => {
        it("windows path", () => {
            strictEqual(extname("c:/foo.txt"), ".txt");
            strictEqual(extname("c:/foo.tar.gz"), ".gz");
            strictEqual(extname("c:/foo"), "");
            strictEqual(extname("c:/foo/"), "");
            strictEqual(extname("c:/"), "");
            strictEqual(extname("c:"), "");
            strictEqual(extname("c:/foo.txt?foo=bar"), ".txt");
            strictEqual(extname("c:/foo.txt#baz"), ".txt");
            strictEqual(extname("c:/foo.txt?foo=bar#baz"), ".txt");
        });

        it("posix path", () => {
            strictEqual(extname("/foo.txt"), ".txt");
            strictEqual(extname("/foo.tar.gz"), ".gz");
            strictEqual(extname("/foo"), "");
            strictEqual(extname("/foo/"), "");
            strictEqual(extname("/"), "");
            strictEqual(extname("/foo.txt?foo=bar"), ".txt");
            strictEqual(extname("/foo.txt#baz"), ".txt");
            strictEqual(extname("/foo.txt?foo=bar#baz"), ".txt");
        });

        it("url", () => {
            strictEqual(extname("http://example.com/foo.txt"), ".txt");
            strictEqual(extname("http://example.com/foo.tar.gz"), ".gz");
            strictEqual(extname("http://example.com/foo"), "");
            strictEqual(basename("http://example.com"), "");
            strictEqual(extname("http://example.com/foo.txt?foo=bar"), ".txt");
            strictEqual(extname("http://example.com/foo.txt#baz"), ".txt");
            strictEqual(extname("http://example.com/foo.txt?foo=bar#baz"), ".txt");
        });

        it("file url", () => {
            strictEqual(extname("file:///foo.txt"), ".txt");
            strictEqual(extname("file:///foo.tar.gz"), ".gz");
            strictEqual(extname("file:///foo"), "");
            strictEqual(extname("file:///foo/"), "");
            strictEqual(extname("file:///"), "");
            strictEqual(extname("file:///foo.txt?foo=bar"), ".txt");
            strictEqual(extname("file:///foo.txt#baz"), ".txt");
            strictEqual(extname("file:///foo.txt?foo=bar#baz"), ".txt");
            strictEqual(extname("file:/foo.txt?foo=bar#baz"), ".txt");
        });

        it("relative path", () => {
            strictEqual(extname("foo.txt"), ".txt");
            strictEqual(extname("foo.tar.gz"), ".gz");
            strictEqual(extname("foo"), "");
            strictEqual(extname("foo/"), "");
            strictEqual(extname(""), "");
            strictEqual(extname("foo.txt?foo=bar"), ".txt");
            strictEqual(extname("foo.txt#baz"), ".txt");
            strictEqual(extname("foo.txt?foo=bar#baz"), ".txt");
        });
    });

    describe("toFileUrl", () => {
        it("windows path", () => {
            strictEqual(toFileUrl("c:\\foo\\bar"), "file:///c:/foo/bar");
            strictEqual(toFileUrl("c:/foo/bar"), "file:///c:/foo/bar");
            strictEqual(toFileUrl("c:/foo/../bar"), "file:///c:/bar");
            strictEqual(toFileUrl("c:/foo"), "file:///c:/foo");
            strictEqual(toFileUrl("c:/foo.txt"), "file:///c:/foo.txt");
            strictEqual(toFileUrl("c:/foo.txt?foo=bar"), "file:///c:/foo.txt?foo=bar");
            strictEqual(toFileUrl("c:/foo.txt#baz"), "file:///c:/foo.txt#baz");
            strictEqual(toFileUrl("c:/foo.txt?foo=bar#baz"), "file:///c:/foo.txt?foo=bar#baz");
        });

        it("posix path", () => {
            strictEqual(toFileUrl("/foo/bar"), "file:///foo/bar");
            strictEqual(toFileUrl("/foo/../bar"), "file:///bar");
            strictEqual(toFileUrl("/foo"), "file:///foo");
            strictEqual(toFileUrl("/foo.txt"), "file:///foo.txt");
            strictEqual(toFileUrl("/foo.txt?foo=bar"), "file:///foo.txt?foo=bar");
            strictEqual(toFileUrl("/foo.txt#baz"), "file:///foo.txt#baz");
            strictEqual(toFileUrl("/foo.txt?foo=bar#baz"), "file:///foo.txt?foo=bar#baz");
        });

        it("relative path", () => {
            const _resolve = (path: string) => {
                const _path = resolve(path).replace(/\\/g, "/");
                return _path[0] === "/" ? _path : "/" + _path;
            };
            strictEqual(toFileUrl("foo/bar"), "file://" + _resolve("foo/bar"));
            strictEqual(toFileUrl("foo/../bar"), "file://" + _resolve("bar"));
            strictEqual(toFileUrl("./foo"), "file://" + _resolve("foo"));
            strictEqual(toFileUrl("foo"), "file://" + _resolve("foo"));
            strictEqual(toFileUrl("foo.txt"), "file://" + _resolve("foo.txt"));
            strictEqual(toFileUrl("foo.txt?foo=bar"), "file://" + _resolve("foo.txt?foo=bar"));
            strictEqual(toFileUrl("foo.txt#baz"), "file://" + _resolve("foo.txt#baz"));
            strictEqual(toFileUrl("foo.txt?foo=bar#baz"), "file://" + _resolve("foo.txt?foo=bar#baz"));
        });

        it("url", () => {
            const [err] = _try(() => toFileUrl("http://example.com/foo/bar"));
            strictEqual(as(err, Error)?.message, "Cannot convert a URL to a file URL.");
        });
    });

    describe("toFsPath", () => {
        it("windows path", () => {
            strictEqual(toFsPath("file:///c:/foo/bar"), "c:\\foo\\bar");
            strictEqual(toFsPath("file:///c:/foo/../bar"), "c:\\bar");
            strictEqual(toFsPath("file:///c:/foo"), "c:\\foo");
            strictEqual(toFsPath("file:///c:/foo.txt"), "c:\\foo.txt");
            strictEqual(toFsPath("file:///c:/foo.txt?foo=bar"), "c:\\foo.txt?foo=bar");
            strictEqual(toFsPath("file:///c:/foo.txt#baz"), "c:\\foo.txt#baz");
            strictEqual(toFsPath("file:///c:/foo.txt?foo=bar#baz"), "c:\\foo.txt?foo=bar#baz");
            strictEqual(toFsPath(new URL("file:///c:/foo.txt?foo=bar#baz")), "c:\\foo.txt?foo=bar#baz");
        });

        it("posix path", () => {
            strictEqual(toFsPath("file:///foo/bar"), "/foo/bar");
            strictEqual(toFsPath("file:///foo/../bar"), "/bar");
            strictEqual(toFsPath("file:///foo"), "/foo");
            strictEqual(toFsPath("file:///foo.txt"), "/foo.txt");
            strictEqual(toFsPath("file:///foo.txt?foo=bar"), "/foo.txt?foo=bar");
            strictEqual(toFsPath("file:///foo.txt#baz"), "/foo.txt#baz");
            strictEqual(toFsPath("file:///foo.txt?foo=bar#baz"), "/foo.txt?foo=bar#baz");
            strictEqual(toFsPath(new URL("file:///foo.txt?foo=bar#baz")), "/foo.txt?foo=bar#baz");
        });

        it("url", () => {
            const [err1] = _try(() => toFsPath("http://example.com/foo/bar"));
            strictEqual(as(err1, Error)?.message, "Cannot convert a non-file URL to a file system path.");

            const [err2] = _try(() => toFsPath(new URL("http://example.com/foo/bar")));
            strictEqual(as(err2, Error)?.message, "Cannot convert a non-file URL to a file system path.");
        });
    });
});
