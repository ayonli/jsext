import "./augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { isNodeBelow16 } from "./env.ts";

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

    it("String.dedent", () => {
        const int = "int";
        const text = "text";

        function example1() {
            return String.dedent`
                    create table student(
                        id ${int} primary key,
                        name ${text}
                    );
                `;
        }

        function example2() {
            return String.dedent`create table student(
                        id ${int} primary key,
                        name ${text}
                    );`;
        }

        function example3() {
            const first = String.dedent`A string that gets so long you need to break it over
                           multiple lines. Luckily dedent is here to keep it
                           readable without lots of spaces ending up in the string
                           itself.`;
            const second = String.dedent`
                    Leading and trailing lines will be trimmed, so you can write something like
                    this and have it work as you expect:

                    * how convenient it is
                    * that I can use an indented list
                        - and still have it do the right thing

                    That's all.
                `;

            return first + "\n\n" + second;
        }

        const expected = "create table student(\n    id int primary key,\n    name text\n);";

        strictEqual(example1(), expected);
        strictEqual(example2(), expected);

        const expected2 = [
            "A string that gets so long you need to break it over",
            "multiple lines. Luckily dedent is here to keep it",
            "readable without lots of spaces ending up in the string",
            "itself.",
            "",
            "Leading and trailing lines will be trimmed, so you can write something like",
            "this and have it work as you expect:",
            "",
            "* how convenient it is",
            "* that I can use an indented list",
            "    - and still have it do the right thing",
            "",
            "That's all.",
        ].join("\n");
        strictEqual(example3(), expected2);
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

    it("String.prototype.dedent", () => {
        function example1() {
            return `
                    create table student(
                        id int primary key,
                        name text
                    );
                `.dedent();
        }

        function example2() {
            return `create table student(
                        id int primary key,
                        name text
                    );`.dedent();
        }

        function example3() {
            const first = `A string that gets so long you need to break it over
                           multiple lines. Luckily dedent is here to keep it
                           readable without lots of spaces ending up in the string
                           itself.`.dedent();
            const second = `
                    Leading and trailing lines will be trimmed, so you can write something like
                    this and have it work as you expect:

                    * how convenient it is
                    * that I can use an indented list
                        - and still have it do the right thing

                    That's all.
                `.dedent();

            return first + "\n\n" + second;
        }

        const expected = "create table student(\n    id int primary key,\n    name text\n);";

        strictEqual(example1(), expected);
        strictEqual(example2(), expected);

        const expected2 = [
            "A string that gets so long you need to break it over",
            "multiple lines. Luckily dedent is here to keep it",
            "readable without lots of spaces ending up in the string",
            "itself.",
            "",
            "Leading and trailing lines will be trimmed, so you can write something like",
            "this and have it work as you expect:",
            "",
            "* how convenient it is",
            "* that I can use an indented list",
            "    - and still have it do the right thing",
            "",
            "That's all."
        ].join("\n");
        strictEqual(example3(), expected2);
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

    it("String.prototype.isEmoji", () => {
        ok(!"H".isEmoji());
        ok(!"世".isEmoji());

        if (!isNodeBelow16) {
            ok("😴😄⛔🎠🚓🚇👨‍👨‍👧‍👧👦🏾".isEmoji());
        } else {
            ok("😴😄".isEmoji());
        }
    });
});
