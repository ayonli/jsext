import "../augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";

describe("String", () => {
    it("String.compare", () => {
        strictEqual(String.compare("A", "a"), -1);
        strictEqual(String.compare("a", "B"), 1);
        strictEqual(String.compare("foo", "foo"), 0);
    });

    it("String.random", () => {
        ok(String.random(4).match(/[0-9a-zA-Z]{4}/));
    });

    it("String.prototype.count", () => {
        const str = "Hello, World";
        strictEqual(str.count("H"), 1);
        strictEqual(str.count("l"), 3);
        strictEqual(str.count("d"), 1);
        strictEqual(str.count(""), str.length + 1);
        strictEqual("".count("a"), 0);
        strictEqual("".count(""), 1);
    });

    it("String.prototype.capitalize", () => {
        strictEqual("hello, world".capitalize(), "Hello, world");
        strictEqual("hello, world".capitalize(true), "Hello, World");
        strictEqual(" hello world".capitalize(), " Hello world");
        strictEqual("  hello    world".capitalize(true), "  Hello    World");
        strictEqual("你好，世界".capitalize(), "你好，世界");
    });

    it("String.prototype.hyphenate", () => {
        strictEqual("hello world".hyphenate(), "hello-world");
        strictEqual(" hello  world   ".hyphenate(), " hello-world   ");
    });

    it("String.prototype.words", () => {
        deepStrictEqual("Hello, World!".words(), ["Hello", "World"]);
        deepStrictEqual("hello_world".words(), ["hello", "world"]);
    });

    it("String.prototype.chunk", () => {
        const str = "foobar";
        deepStrictEqual(str.chunk(2), ["fo", "ob", "ar"]);
        deepStrictEqual(str.chunk(4), ["foob", "ar"]);
    });

    it("String.prototype.truncate", () => {
        const str = "Hello, World!";
        strictEqual(str.truncate(15), "Hello, World!");
        strictEqual(str.truncate(12), "Hello, Wo...");
        strictEqual(str.truncate(10), "Hello, ...");
        strictEqual(str.truncate(-1), ""); // negative indexing isn't supported
    });

    it("String.prototype.trim", () => {
        strictEqual("  Hello, World!  ".trim(), "Hello, World!");
        strictEqual("!!!Hello, World!!!".trim("!"), "Hello, World");
    });

    it("String.prototype.trimEnd", () => {
        strictEqual("  Hello, World!  ".trimEnd(), "  Hello, World!");
        strictEqual("!!!Hello, World!!!".trimEnd("!"), "!!!Hello, World");
    });

    it("String.prototype.trimStart", () => {
        strictEqual("  Hello, World!  ".trimStart(), "Hello, World!  ");
        strictEqual("!!!Hello, World!!!".trimStart("!"), "Hello, World!!!");
    });

    it("String.prototype.byteLength", () => {
        strictEqual("Hello, World!".byteLength(), 13);
        strictEqual("你好，世界！".byteLength(), 18);
    });
});
