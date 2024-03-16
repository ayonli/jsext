import { deepStrictEqual, ok, strictEqual } from "node:assert";
import * as path from "node:path";
import {
    basename,
    cwd,
    dirname,
    extname,
    isAbsolute,
    isFileUrl,
    isPosixPath,
    isUrl,
    isWindowsPath,
    join,
    normalize,
    resolve,
    split,
} from "./index.ts";

declare const Deno: any;

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

            deepStrictEqual(split("?foo=bar"), ["?foo=bar"]);
            deepStrictEqual(split("#baz"), ["#baz"]);
            deepStrictEqual(split("?foo=bar#baz"), ["?foo=bar", "#baz"]);
            deepStrictEqual(split("?foo=hello&bar=world#baz"), ["?foo=hello&bar=world", "#baz"]);
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
            deepStrictEqual(split("foo/"), ["foo"]);
            deepStrictEqual(split("foo/bar"), ["foo", "bar"]);
            deepStrictEqual(split("foo//bar/"), ["foo", "bar"]);
            deepStrictEqual(split("foo\\bar"), ["foo", "bar"]);
            deepStrictEqual(split("foo\\bar\\"), ["foo", "bar"]);
        });

        it("file url", () => {
            deepStrictEqual(split("file:///"), ["file://"]);
            deepStrictEqual(split("file:///foo"), ["file://", "foo"]);
            deepStrictEqual(split("file:///foo/bar"), ["file://", "foo", "bar"]);
            deepStrictEqual(split("file:///foo/bar/"), ["file://", "foo", "bar"]);
            deepStrictEqual(split("file://localhost/foo/bar/"), ["file://", "foo", "bar"]);
            deepStrictEqual(split("file://example.com/foo/bar/"), ["file://example.com", "foo", "bar"]);
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
            strictEqual(join("http://example.com", "foo", "..", "bar"), "http://example.com/bar");
            strictEqual(join("http://example.com", "foo", "../bar"), "http://example.com/bar");
            strictEqual(join(
                "http://example.com",
                "foo",
                "../bar?foo=bar"
            ), "http://example.com/bar?foo=bar");
            strictEqual(join(
                "http://example.com",
                "foo",
                "../bar#baz"
            ), "http://example.com/bar#baz");
            strictEqual(join(
                "http://example.com",
                "foo",
                "../bar?foo=bar#baz"
            ), "http://example.com/bar?foo=bar#baz");
            strictEqual(join(
                "http://example.com/foo/../bar",
                "?foo=bar#baz"
            ), "http://example.com/bar?foo=bar#baz");
        });

        it("windows path", () => {
            strictEqual(join("c:"), "c:");
            strictEqual(join("c:", "foo"), "c:\\foo");
            strictEqual(join("c:", "foo", "bar"), "c:\\foo\\bar");
            strictEqual(join("c:", "foo", "bar", "baz"), "c:\\foo\\bar\\baz");
            strictEqual(join("c:", "foo", "bar", "..", "baz"), "c:\\foo\\baz");
            strictEqual(join("c:", "foo", "bar", "..\\baz"), "c:\\foo\\baz");
        });

        it("posix path", () => {
            strictEqual(join("/"), "/");
            strictEqual(join("/", "foo"), "/foo");
            strictEqual(join("/", "foo", "bar"), "/foo/bar");
            strictEqual(join("/", "foo", "bar", "baz"), "/foo/bar/baz");
            strictEqual(join("/", "foo", "bar", "..", "baz"), "/foo/baz");
            strictEqual(join("/", "foo", "bar", "../baz"), "/foo/baz");
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
        });

        it("file url", () => {
            strictEqual(join("file://"), "file://");
            strictEqual(join("file://", "foo"), "file:///foo");
            deepStrictEqual(join("file://", "foo", "bar"), "file:///foo/bar");
            deepStrictEqual(
                join("file://", "foo", "bar", "?foo=bar", "#baz"),
                "file:///foo/bar?foo=bar#baz"
            );
            deepStrictEqual(join("file://localhost", "foo", "bar"), "file:///foo/bar");
            deepStrictEqual(join("file://example.com", "foo", "bar"), "file://example.com/foo/bar");
        });
    });

    describe("resolve", () => {
        it("url", () => {
            strictEqual(
                resolve("http://example.com/foo/../bar?foo=bar#baz"),
                "http://example.com/bar?foo=bar#baz"
            );
            strictEqual(resolve("http://example.com", "foo/../bar"), "http://example.com/bar");
            strictEqual(resolve("http://example.com/foo", "./bar"), "http://example.com/foo/bar");
            strictEqual(resolve("http://example.com/foo", "../bar"), "http://example.com/bar");
            strictEqual(
                resolve("http://example.com/foo", "../bar", "?foo=bar"),
                "http://example.com/bar?foo=bar"
            );
            strictEqual(
                resolve("http://example.com/foo", "http://example2.com/foo", "../bar"),
                "http://example2.com/bar"
            );
            strictEqual(resolve("http://example.com", "/foo", "../bar"), "/bar");
            strictEqual(resolve("http://example.com", "c:/foo", "../bar"), "c:\\bar");
        });

        it("windows path", () => {
            strictEqual(resolve("c:/foo/../bar"), "c:\\bar");
            strictEqual(resolve("c:/foo", "bar"), "c:\\foo\\bar");
            strictEqual(resolve("c:/foo", "../bar"), "c:\\bar");
            strictEqual(resolve("c:/foo", "../bar", "baz"), "c:\\bar\\baz");
            strictEqual(resolve("c:/foo", "c:/foo2", "../bar"), "c:\\bar");
            strictEqual(resolve("c:/foo", "/foo", "../bar"), "/bar");
            strictEqual(resolve("c:/foo", "http://localhost/foo", "../bar"), "http://localhost/bar");
        });

        it("posix path", () => {
            strictEqual(resolve("/foo/../bar"), "/bar");
            strictEqual(resolve("/foo", "bar"), "/foo/bar");
            strictEqual(resolve("/foo", "../bar"), "/bar");
            strictEqual(resolve("/foo", "../bar", "baz"), "/bar/baz");
            strictEqual(resolve("/foo", "/foo2", "../bar"), "/bar");
            strictEqual(resolve("/foo", "c:/foo", "../bar"), "c:\\bar");
            strictEqual(resolve("/foo", "http://localhost/foo", "../bar"), "http://localhost/bar");
        });

        it("relative path", () => {
            strictEqual(resolve("foo/../bar"), path.resolve("bar"));
            strictEqual(resolve("foo", "bar"), path.resolve("foo", "bar"));
            strictEqual(resolve("foo", "../bar"), path.resolve("foo", "../bar"));
            strictEqual(resolve("foo", "../bar", "baz"), path.resolve("foo", "../bar", "baz"));
            strictEqual(resolve("foo", "c:/foo", "../bar"), "c:\\bar");
            strictEqual(resolve("foo", "/foo", "../bar"), "/bar");
            strictEqual(resolve("foo", "http://localhost/foo", "../bar"), "http://localhost/bar");
        });

        it("file url", () => {
            strictEqual(resolve("file:///foo/../bar"), "file:///bar");
            strictEqual(resolve("file:///foo", "bar"), "file:///foo/bar");
            strictEqual(resolve("file:///foo", "../bar"), "file:///bar");
            strictEqual(resolve("file:///foo", "../bar", "baz"), "file:///bar/baz");
            strictEqual(resolve("file:///foo", "file:///foo2", "../bar"), "file:///bar");
            strictEqual(resolve("file:///foo", "/foo", "../bar"), "/bar");
            strictEqual(resolve("file:///foo", "http://localhost/foo", "../bar"), "http://localhost/bar");
        })
    });

    describe("normalize", () => {
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

        it("windows path", () => {
            strictEqual(normalize("c:/foo/../bar"), "c:\\bar");
            strictEqual(normalize("c:/foo/bar/.."), "c:\\foo");
            strictEqual(normalize("c:/foo/bar/../"), "c:\\foo");
            strictEqual(normalize("c:/foo/.."), "c:\\");
            strictEqual(normalize("c:/foo/../.."), "c:\\");
            strictEqual(normalize("c:/foo/./bar"), "c:\\foo\\bar");
            strictEqual(normalize("c:/foo/././/bar"), "c:\\foo\\bar");
        });

        it("posix path", () => {
            strictEqual(normalize("/foo/../bar"), "/bar");
            strictEqual(normalize("/foo/bar/.."), "/foo");
            strictEqual(normalize("/foo/bar/../"), "/foo");
            strictEqual(normalize("/foo/.."), "/");
            strictEqual(normalize("/foo/../.."), "/");
            strictEqual(normalize("/foo/./bar"), "/foo/bar");
            strictEqual(normalize("/foo/././bar"), "/foo/bar");
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
        });

        it("file url", () => {
            strictEqual(normalize("file:///foo/../bar"), "file:///bar");
            strictEqual(normalize("file:///foo/bar/.."), "file:///foo");
            strictEqual(normalize("file:///foo/bar/../"), "file:///foo");
            strictEqual(normalize("file:///foo/.."), "file:///");
            strictEqual(normalize("file:///foo/../.."), "file:///");
            strictEqual(normalize("file:///foo/./bar"), "file:///foo/bar");
            strictEqual(normalize("file:///foo/././/bar"), "file:///foo/bar");
        })
    });

    describe("dirname", () => {
        it("url", () => {
            strictEqual(dirname("http://example.com/foo/bar?foo=bar#baz"), "http://example.com/foo");
            strictEqual(dirname("http://example.com/foo?foo=bar#baz"), "http://example.com");
            strictEqual(dirname("http://example.com/foo/../bar?foo=bar#baz"), "http://example.com");
            strictEqual(dirname("http://example.com/?foo=bar#baz"), "http://example.com");
            strictEqual(dirname("http://example.com?foo=bar#baz"), "http://example.com");
        });

        it("windows path", () => {
            strictEqual(dirname("c:/foo/bar"), "c:\\foo");
            strictEqual(dirname("c:/foo/bar/"), "c:\\foo");
            strictEqual(dirname("c:/foo/../bar"), "c:\\");
            strictEqual(dirname("c:/foo/"), "c:\\");
            strictEqual(dirname("c:/foo"), "c:\\");
        });

        it("posix path", () => {
            strictEqual(dirname("/foo/bar"), "/foo");
            strictEqual(dirname("/foo/bar/"), "/foo");
            strictEqual(dirname("/foo/../bar"), "/");
            strictEqual(dirname("/foo/"), "/");
            strictEqual(dirname("/foo"), "/");
        });

        it("relative path", () => {
            strictEqual(dirname("foo/bar"), "foo");
            strictEqual(dirname("foo/bar/"), "foo");
            strictEqual(dirname("foo/bar/baz"), path.join("foo", "bar"));
            strictEqual(dirname("foo/../bar"), ".");
            strictEqual(dirname("foo/"), ".");
            strictEqual(dirname("foo"), ".");
            strictEqual(dirname(""), ".");
        });

        it("file url", () => {
            strictEqual(dirname("file:///foo/bar"), "file:///foo");
            strictEqual(dirname("file:///foo/bar/"), "file:///foo");
            strictEqual(dirname("file:///foo/../bar"), "file:///");
            strictEqual(dirname("file:///foo/"), "file:///");
            strictEqual(dirname("file:///foo"), "file:///");
        })
    });

    describe("basename", () => {
        it("url", () => {
            strictEqual(basename("http://example.com/foo.txt"), "foo.txt");
            strictEqual(basename("http://example.com/foo.txt?foo=bar#baz"), "foo.txt");
            strictEqual(basename("http://example.com/foo"), "foo");
            strictEqual(basename("http://example.com"), "");
            strictEqual(basename("http://example.com/foo.txt", ".txt"), "foo");
            strictEqual(basename("http://example.com/foo.txt", ".ts"), "foo.txt");
        });

        it("windows path", () => {
            strictEqual(basename("c:/foo/bar"), "bar");
            strictEqual(basename("c:/foo/bar/"), "bar");
            strictEqual(basename("c:/foo/../bar"), "bar");
            strictEqual(basename("c:/foo/"), "foo");
            strictEqual(basename("c:/foo"), "foo");
            strictEqual(basename("c:/"), "");
            strictEqual(basename("c:"), "");
            strictEqual(basename("c:/foo.txt", ".txt"), "foo");
            strictEqual(basename("c:/foo.txt", ".ts"), "foo.txt");
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
        })
    });

    describe("extname", () => {
        it("url", () => {
            strictEqual(extname("http://example.com/foo.txt"), ".txt");
            strictEqual(extname("http://example.com/foo.txt?foo=bar#baz"), ".txt");
            strictEqual(extname("http://example.com/foo.tar.gz"), ".gz");
            strictEqual(extname("http://example.com/foo"), "");
            strictEqual(basename("http://example.com"), "");
        });

        it("windows path", () => {
            strictEqual(extname("c:/foo.txt"), ".txt");
            strictEqual(extname("c:/foo.tar.gz"), ".gz");
            strictEqual(extname("c:/foo"), "");
            strictEqual(extname("c:/foo/"), "");
            strictEqual(extname("c:/"), "");
            strictEqual(extname("c:"), "");
        });

        it("posix path", () => {
            strictEqual(extname("/foo.txt"), ".txt");
            strictEqual(extname("/foo.tar.gz"), ".gz");
            strictEqual(extname("/foo"), "");
            strictEqual(extname("/foo/"), "");
            strictEqual(extname("/"), "");
        });

        it("relative path", () => {
            strictEqual(extname("foo.txt"), ".txt");
            strictEqual(extname("foo.tar.gz"), ".gz");
            strictEqual(extname("foo"), "");
            strictEqual(extname("foo/"), "");
            strictEqual(extname(""), "");
        });

        it("file url", () => {
            strictEqual(extname("file:///foo.txt"), ".txt");
            strictEqual(extname("file:///foo.tar.gz"), ".gz");
            strictEqual(extname("file:///foo"), "");
            strictEqual(extname("file:///foo/"), "");
            strictEqual(extname("file:///"), "");
        })
    });
});
