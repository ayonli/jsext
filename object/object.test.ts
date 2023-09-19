import "../augment.ts";
import { describe, test } from "mocha";
import { deepStrictEqual, ok, strictEqual } from "assert";

describe("Object", () => {
    test("Object.hasOwn", () => {
        const obj1 = { foo: "hello" };
        const obj2 = Object.create(obj1);
        obj2["bar"] = "world";

        ok(Object.hasOwn(obj1, "foo"));
        ok(Object.hasOwn(obj2, "bar"));
        ok(!Object.hasOwn(obj2, "foo"));
        ok(obj2.foo === obj1.foo);
    });

    test("Object.hasOwnMethod", () => {
        class Foo {
            say(word: string) {
                console.log(word);
            }
        }

        class Bar extends Foo {
            constructor(public echo: (text: string) => string) {
                super();
            }

            show(text: string) {
                console.log(text);
            }

            get display() {
                return (str: string) => {
                    console.log(str);
                };
            }
        }

        // @ts-ignore
        Bar.prototype["abc"] = function () { };

        const obj = new Bar((text: string) => text);
        ok(Object.hasOwnMethod(obj, "show"));
        ok(!Object.hasOwnMethod(obj, "say"));
        ok(!Object.hasOwnMethod(obj, "echo"));
        ok(!Object.hasOwnMethod(obj, "display"));
        ok(Object.hasOwnMethod(obj, "abc"));
    });

    test("Object.patch", () => {
        const obj = { foo: "hello" };

        deepStrictEqual(Object.patch(obj, { foo: "hi", bar: "world", }), {
            foo: "hello",
            bar: "world",
        });
        deepStrictEqual(obj, { foo: "hello", bar: "world", });

        deepStrictEqual(Object.patch(obj, { bar: "A-yon", }, { num: 123 }), {
            foo: "hello",
            bar: "world",
            num: 123,
        });
    });

    test("Object.pick", () => {
        const symbol1 = Symbol("symbol1");
        const symbol2 = Symbol("symbol2");
        const obj = { foo: "hello", bar: "world", [symbol1]: 123, [symbol2]: 456 };
        deepStrictEqual(Object.pick(obj, ["foo", symbol1]), { foo: "hello", [symbol1]: 123 });
        deepStrictEqual(Object.pick(obj, ["constructor"]), { constructor: Object });
    });

    test("Object.omit", () => {
        const symbol1 = Symbol("symbol1");
        const symbol2 = Symbol("symbol2");
        const obj = { foo: "hello", bar: "world", [symbol1]: 123, [symbol2]: 456 };
        deepStrictEqual(Object.omit(obj, ["foo"]), { bar: "world", [symbol1]: 123, [symbol2]: 456 });

        class A {
            foo = "hello";
            [symbol1] = 123;
            [symbol2] = 456;
        }
        class B extends A {
            bar = "world";
        }

        deepStrictEqual(Object.omit(new B(), ["bar", symbol2]), { foo: "hello", [symbol1]: 123 });
    });

    test("Object.as", () => {
        class Foo {
            echo(text: string) {
                return text;
            }
        }

        strictEqual(Object.as("hello, world", String), "hello, world");
        strictEqual(Object.as("hello, world", Number), null);
        strictEqual(Object.as(new String("hello, world"), String), "hello, world");

        strictEqual(Object.as(123, Number), 123);
        strictEqual(Object.as(123, BigInt), null);
        strictEqual(Object.as(new Number(123), Number), 123);

        strictEqual(Object.as(BigInt(123), BigInt), BigInt(123));
        strictEqual(Object.as(BigInt(123), Number), null);

        strictEqual(Object.as(true, Boolean), true);
        strictEqual(Object.as(false, Object), null);
        strictEqual(Object.as(new Boolean(), Boolean), false);

        strictEqual(Object.as(Symbol.for("foo"), Symbol), Symbol.for("foo"));
        strictEqual(Object.as(Symbol.for("foo"), String), null);

        const obj: any = new Foo();
        strictEqual(Object.as(obj, Foo), obj);
        strictEqual(Object.as(obj, Array), null);
        strictEqual(Object.as(obj, Foo)?.echo("hello, world"), "hello, world");

        const re: any = /[0-9a-zA-Z]/;
        strictEqual(Object.as(re, RegExp), re);
        strictEqual(Object.as(re, Object), re);
        strictEqual(Object.as(re, Array), null);
        strictEqual(Object.as(re, RegExp)?.source, "[0-9a-zA-Z]");

        const fn: any = () => null;
        strictEqual(Object.as(fn, Function), fn);
        strictEqual(Object.as(fn, Object), fn);
        strictEqual(Object.as(fn, Function)?.name, "fn");
    });

    test("Object.isValid", () => {
        ok(Object.isValid(""));
        ok(Object.isValid(0));
        ok(Object.isValid(false));
        ok(Object.isValid({}));
        ok(Object.isValid([]));
        ok(!Object.isValid(undefined));
        ok(!Object.isValid(null));
        ok(!Object.isValid(NaN));
        ok(!Object.isValid(new Date("foobar")));
    });
});
