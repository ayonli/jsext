import "../augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";

describe("Object", () => {
    it("Object.hasOwn", () => {
        const obj1 = { foo: "hello" };
        const obj2 = Object.create(obj1);
        obj2["bar"] = "world";

        ok(Object.hasOwn(obj1, "foo"));
        ok(Object.hasOwn(obj2, "bar"));
        ok(!Object.hasOwn(obj2, "foo"));
        ok(obj2.foo === obj1.foo);
    });

    it("Object.hasOwnMethod", () => {
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

    it("Object.patch", () => {
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

    it("Object.pick", () => {
        const symbol1 = Symbol("symbol1");
        const symbol2 = Symbol("symbol2");
        const obj = { foo: "hello", bar: "world", [symbol1]: 123, [symbol2]: 456 };
        deepStrictEqual(Object.pick(obj, ["foo", symbol1]), { foo: "hello", [symbol1]: 123 });
        deepStrictEqual(Object.pick(obj, ["constructor"]), { constructor: Object });
    });

    it("Object.omit", () => {
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

    it("Object.as", () => {
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

    it("Object.isValid", () => {
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

    it("Object.isPlainObject", () => {
        ok(Object.isPlainObject({}));
        ok(Object.isPlainObject(Object.create(null)));
        ok(!Object.isPlainObject([]));
        ok(!Object.isPlainObject(""));
        ok(!Object.isPlainObject(new Date()));
    });

    it("Object.typeOf", () => {
        strictEqual(Object.typeOf("foobar"), "string");
        strictEqual(Object.typeOf(123), "number");
        strictEqual(Object.typeOf(NaN), "number");
        strictEqual(Object.typeOf(BigInt(123)), "bigint");
        strictEqual(Object.typeOf(true), "boolean");
        strictEqual(Object.typeOf(Symbol("foobar")), "symbol");
        strictEqual(Object.typeOf(function foo() { }), "function");
        strictEqual(Object.typeOf(function Foo() { }), "function");
        strictEqual(Object.typeOf(() => { }), "function");
        strictEqual(Object.typeOf(async () => { }), "function");
        strictEqual(Object.typeOf(async function foo() { }), "function");
        strictEqual(Object.typeOf(function* foo() { }), "function");
        strictEqual(Object.typeOf(async function* foo() { }), "function");
        strictEqual(Object.typeOf(String), "function");
        strictEqual(Object.typeOf(Number), "function");
        strictEqual(Object.typeOf(Boolean), "function");
        strictEqual(Object.typeOf(BigInt), "function");
        strictEqual(Object.typeOf(Symbol), "function");
        strictEqual(Object.typeOf(Object), "class");
        strictEqual(Object.typeOf(Array), "class");
        strictEqual(Object.typeOf(Date), "class");
        strictEqual(Object.typeOf(Function), "class");
        strictEqual(Object.typeOf(class Foo { }), "class");
        strictEqual(Object.typeOf(Uint8Array), "class");
        strictEqual(Object.typeOf(undefined), "undefined");
        strictEqual(Object.typeOf(null), "null");
        strictEqual(Object.typeOf({}), Object);
        strictEqual(Object.typeOf(Object.create(null)), Object);
        strictEqual(Object.typeOf([]), Array);
        strictEqual(Object.typeOf(new Uint8Array()), Uint8Array);
    });

    describe("Object.sanitize", () => {
        const obj = {
            name: " Hello, World! ",
            str: " ",
            nil: void 0,
            nil2: null,
            nil3: NaN,
            date: new Date("invalid"),
            obj: { foo: void 0, bar: null },
            arr: [" Hello, World! ", " ", void 0, null, NaN, { foo: void 0, bar: null }],
        };

        it("object", () => {
            deepStrictEqual(Object.sanitize(obj), {
                name: "Hello, World!",
                str: "",
                nil2: null,
                obj: { foo: void 0, bar: null },
                arr: [" Hello, World! ", " ", void 0, null, NaN, { foo: void 0, bar: null }],
            });
            deepStrictEqual(Object.sanitize(obj, true), {
                name: "Hello, World!",
                str: "",
                nil2: null,
                obj: { bar: null },
                arr: ["Hello, World!", "", void 0, null, NaN, { bar: null }],
            });
            deepStrictEqual(Object.sanitize(obj, { deep: true }), {
                name: "Hello, World!",
                str: "",
                nil2: null,
                obj: { bar: null },
                arr: ["Hello, World!", "", void 0, null, NaN, { bar: null }],
            });
            deepStrictEqual(Object.sanitize(obj, { deep: true, removeNulls: true }), {
                name: "Hello, World!",
                str: "",
                obj: {},
                arr: ["Hello, World!", "", void 0, null, NaN, {}],
            });
            deepStrictEqual(Object.sanitize(obj, {
                deep: true,
                removeNulls: true,
                removeEmptyStrings: true,
            }), {
                name: "Hello, World!",
                obj: {},
                arr: ["Hello, World!", "", void 0, null, NaN, {}],
            });
            deepStrictEqual(Object.sanitize(obj, {
                deep: true,
                removeNulls: true,
                removeEmptyStrings: true,
                removeEmptyObjects: true,
            }), {
                name: "Hello, World!",
                arr: ["Hello, World!", "", void 0, null, NaN, {}],
            });
            deepStrictEqual(Object.sanitize(obj, {
                deep: true,
                removeNulls: true,
                removeEmptyStrings: true,
                removeEmptyObjects: true,
                removeArrayItems: true,
            }), {
                name: "Hello, World!",
                arr: ["Hello, World!"],
            });
        });

        it("array", () => {
            deepStrictEqual(Object.sanitize([obj]), [obj]);
            deepStrictEqual(Object.sanitize([obj], true), [{
                name: "Hello, World!",
                str: "",
                nil2: null,
                obj: { bar: null },
                arr: ["Hello, World!", "", void 0, null, NaN, { bar: null }],
            }]);
            deepStrictEqual(Object.sanitize([obj], {
                deep: true,
                removeArrayItems: true,
            }), [{
                name: "Hello, World!",
                str: "",
                nil2: null,
                obj: { bar: null },
                arr: ["Hello, World!", "", null, { bar: null }],
            }]);
        });
    });

    describe("Object.sortKeys", () => {
        const obj = {
            str: "foobar",
            num: 123,
            bool: true,
            nil: null,
            obj: { foo: "hello", bar: "world" },
            arr: [{ foo: "hello", bar: "world" }],
        };

        it("object", () => {
            strictEqual(JSON.stringify(Object.sortKeys(obj)), JSON.stringify({
                arr: [{ foo: "hello", bar: "world" }],
                bool: true,
                nil: null,
                num: 123,
                obj: { foo: "hello", bar: "world" },
                str: "foobar",
            }));
            strictEqual(JSON.stringify(Object.sortKeys(obj, true)), JSON.stringify({
                arr: [{ bar: "world", foo: "hello" }],
                bool: true,
                nil: null,
                num: 123,
                obj: { bar: "world", foo: "hello" },
                str: "foobar",
            }));
        });

        it("array", () => {
            strictEqual(JSON.stringify(Object.sortKeys([obj])), JSON.stringify([obj]));
            strictEqual(JSON.stringify(Object.sortKeys([obj], true)), JSON.stringify([{
                arr: [{ bar: "world", foo: "hello" }],
                bool: true,
                nil: null,
                num: 123,
                obj: { bar: "world", foo: "hello" },
                str: "foobar",
            }]));
        });
    });

    describe("Object.flatKeys", () => {
        const obj = {
            foo: "hello",
            bar: "world",
            baz: {
                foo: "hello",
                bar: "world",
                baz: {
                    foo: "hello",
                    bar: "world",
                    baz: {
                        foo: "hello",
                        bar: "world",
                    }
                },
                arr: [
                    "hello",
                    "world",
                    {
                        foo: "hello",
                        bar: "world",
                    }
                ],
            }
        };

        it("object", () => {
            deepStrictEqual(Object.flatKeys(obj), {
                foo: "hello",
                bar: "world",
                "baz.foo": "hello",
                "baz.bar": "world",
                "baz.baz": {
                    foo: "hello",
                    bar: "world",
                    baz: {
                        foo: "hello",
                        bar: "world",
                    },
                },
                "baz.arr": [
                    "hello",
                    "world",
                    {
                        foo: "hello",
                        bar: "world",
                    }
                ],
            });
            deepStrictEqual(Object.flatKeys(obj, 2), {
                foo: "hello",
                bar: "world",
                "baz.foo": "hello",
                "baz.bar": "world",
                "baz.baz.foo": "hello",
                "baz.baz.bar": "world",
                "baz.baz.baz": {
                    foo: "hello",
                    bar: "world",
                },
                "baz.arr": [
                    "hello",
                    "world",
                    {
                        foo: "hello",
                        bar: "world",
                    }
                ],
            });
            deepStrictEqual(Object.flatKeys(obj, Infinity), {
                foo: "hello",
                bar: "world",
                "baz.foo": "hello",
                "baz.bar": "world",
                "baz.baz.foo": "hello",
                "baz.baz.bar": "world",
                "baz.baz.baz.foo": "hello",
                "baz.baz.baz.bar": "world",
                "baz.arr": [
                    "hello",
                    "world",
                    {
                        foo: "hello",
                        bar: "world",
                    }
                ],
            });
            deepStrictEqual(Object.flatKeys(obj, 2, { flatArrayIndices: true }), {
                foo: "hello",
                bar: "world",
                "baz.foo": "hello",
                "baz.bar": "world",
                "baz.baz.foo": "hello",
                "baz.baz.bar": "world",
                "baz.baz.baz": {
                    foo: "hello",
                    bar: "world",
                },
                "baz.arr.0": "hello",
                "baz.arr.1": "world",
                "baz.arr.2": {
                    foo: "hello",
                    bar: "world",
                },
            });
            deepStrictEqual(Object.flatKeys(obj, Infinity, { flatArrayIndices: true }), {
                foo: "hello",
                bar: "world",
                "baz.foo": "hello",
                "baz.bar": "world",
                "baz.baz.foo": "hello",
                "baz.baz.bar": "world",
                "baz.baz.baz.foo": "hello",
                "baz.baz.baz.bar": "world",
                "baz.arr.0": "hello",
                "baz.arr.1": "world",
                "baz.arr.2.foo": "hello",
                "baz.arr.2.bar": "world",
            });
        });

        it("array", () => {
            deepStrictEqual(Object.flatKeys([obj]), [obj]);
            deepStrictEqual(Object.flatKeys([obj], 1, { flatArrayIndices: true }), {
                "0.foo": "hello",
                "0.bar": "world",
                "0.baz": obj.baz,
                length: 1,
            });
            deepStrictEqual(Object.flatKeys([obj], 2, { flatArrayIndices: true }), {
                "0.foo": "hello",
                "0.bar": "world",
                "0.baz.foo": "hello",
                "0.baz.bar": "world",
                "0.baz.baz": {
                    foo: "hello",
                    bar: "world",
                    baz: {
                        foo: "hello",
                        bar: "world",
                    }
                },
                "0.baz.arr": [
                    "hello",
                    "world",
                    {
                        foo: "hello",
                        bar: "world",
                    }
                ],
                length: 1,
            });
            deepStrictEqual(Object.flatKeys([obj], Infinity, { flatArrayIndices: true }), {
                "0.foo": "hello",
                "0.bar": "world",
                "0.baz.foo": "hello",
                "0.baz.bar": "world",
                "0.baz.baz.foo": "hello",
                "0.baz.baz.bar": "world",
                "0.baz.baz.baz.foo": "hello",
                "0.baz.baz.baz.bar": "world",
                "0.baz.arr.0": "hello",
                "0.baz.arr.1": "world",
                "0.baz.arr.2.foo": "hello",
                "0.baz.arr.2.bar": "world",
                length: 1,
            });
        });

        it("non-plain object", () => {
            const date = new Date();
            strictEqual(Object.flatKeys(date), date);
        });
    });
});
