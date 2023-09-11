import "./string";
import { test } from "mocha";
import { deepStrictEqual, ok, strictEqual } from "assert";

test("String.compare", () => {
    strictEqual(String.compare("A", "a"), -1);
    strictEqual(String.compare("a", "B"), 1);
    strictEqual(String.compare("foo", "foo"), 0);
});

test("String.random", () => {
    ok(String.random(4).match(/[0-9a-zA-Z]{4}/));
});

test("String.prototype.count", () => {
    const str = "Hello, World";
    strictEqual(str.count("H"), 1);
    strictEqual(str.count("l"), 3);
    strictEqual(str.count("d"), 1);
    strictEqual(str.count(""), str.length + 1);
    strictEqual("".count("a"), 0);
    strictEqual("".count(""), 1);
});

test("String.prototype.capitalize", () => {
    strictEqual("hello, world".capitalize(), "Hello, world");
    strictEqual("hello, world".capitalize(true), "Hello, World");
    strictEqual(" hello world".capitalize(), " Hello world");
    strictEqual("  hello    world".capitalize(true), "  Hello    World");
    strictEqual("你好，世界".capitalize(), "你好，世界");
});

test("String.prototype.hyphenate", () => {
    strictEqual("hello world".hyphenate(), "hello-world");
    strictEqual(" hello  world   ".hyphenate(), " hello-world   ");
});

test("String.prototype.words", () => {
    deepStrictEqual("Hello, World!".words(), ["Hello", "World"]);
});

test("String.prototype.chunk", () => {
    const str = "foobar";
    deepStrictEqual(str.chunk(2), ["fo", "ob", "ar"]);
    deepStrictEqual(str.chunk(4), ["foob", "ar"]);
});

test("String.prototype.truncate", () => {
    const str = "Hello, World!";
    strictEqual(str.truncate(15), "Hello, World!");
    strictEqual(str.truncate(12), "Hello, Wo...");
    strictEqual(str.truncate(10), "Hello, ...");
    strictEqual(str.truncate(-1), ""); // negative indexing isn't supported
});

test("String.prototype.byteLength", () => {
    strictEqual("Hello, World!".byteLength(), 13);
    strictEqual("你好，世界！".byteLength(), 18);
});
