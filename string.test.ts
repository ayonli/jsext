import "./augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { isNodeBelow16 } from "./parallel/constants.ts";

describe("String", () => {
    it("String.compare", () => {
        strictEqual(String.compare("A", "a"), -1);
        strictEqual(String.compare("a", "B"), 1);
        strictEqual(String.compare("foo", "foo"), 0);
    });

    it("String.random", () => {
        ok(String.random(4).match(/[0-9a-zA-Z]{4}/));
        ok(String.random(10, "01234567890").match(/[0-9]{10}/));

        const chars = "😴😄⛔🎠🚓🚇";
        const randStr = String.random(4, chars);
        strictEqual(randStr.chars().length, 4);
        ok(randStr.chars().every(char => chars.includes(char)));
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

    it("String.prototype.bytes", () => {
        const encoder = new TextEncoder();
        deepStrictEqual("Hello, World!".bytes().buffer, encoder.encode("Hello, World!").buffer);
        deepStrictEqual("你好，世界！".bytes().buffer, encoder.encode("你好，世界！").buffer);
    });

    it("String.prototype.chars", () => {
        deepStrictEqual("foo".chars(), ["f", "o", "o"]);
        deepStrictEqual("你好".chars(), ["你", "好"]);

        if (!isNodeBelow16) {
            deepStrictEqual("😴😄⛔🎠🚓🚇👨‍👨‍👧‍👧👦🏾".chars(), ["😴", "😄", "⛔", "🎠", "🚓", "🚇", "👨‍👨‍👧‍👧", "👦🏾"]);
        }
    });

    it("String.prototype.words", () => {
        deepStrictEqual("Hello, World!".words(), ["Hello", "World"]);
        deepStrictEqual("hello_world".words(), ["hello", "world"]);
    });

    it("String.prototype.lines", () => {
        deepStrictEqual("Hello World".lines(), ["Hello World"]);
        deepStrictEqual("Hello\nWorld".lines(), ["Hello", "World"]);
        deepStrictEqual("Hello\r\nWorld".lines(), ["Hello", "World"]);
        deepStrictEqual("Hello\r\n\rWorld".lines(), ["Hello", "\rWorld"]);
        deepStrictEqual("Hello\r\n\r\n\nWorld".lines(), ["Hello", "", "", "World"]);
        deepStrictEqual("Hello\nWorld\n".lines(), ["Hello", "World", ""]);
        deepStrictEqual("Hello\nWorld\r\n".lines(), ["Hello", "World", ""]);
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

    it("String.prototype.stripEnd", () => {
        strictEqual("foo:bar".stripEnd(":bar"), "foo");
        strictEqual("foo".stripEnd(":bar"), "foo");
    });

    it("String.prototype.stripStart", () => {
        strictEqual("foo:bar".stripStart("foo:"), "bar");
        strictEqual("bar".stripStart("foo"), "bar");
    });

    it("String.prototype.byteLength", () => {
        strictEqual("Hello, World!".byteLength(), 13);
        strictEqual("你好，世界！".byteLength(), 18);
    });

    it("String.prototype.isAscii", () => {
        ok("Hello, World!".isAscii());
        ok(!"Hello, 世界！".isAscii());
        ok(!"Hello, 😴😄".isAscii());
        ok("\u{00}\u{19}".isAscii());
        ok(!"\u{00}\u{19}".isAscii(true));
    });
});
