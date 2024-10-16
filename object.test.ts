import "./augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { Comparable } from "./types.ts";
import _try from "./try.ts";
import { fromObject, toObject } from "./error.ts";
import bytes from "./bytes.ts";
import { isBun } from "./env.ts";

class Person implements Comparable {
    constructor(public name: string, public age: number) { }

    compareTo(other: this): -1 | 0 | 1 {
        return this.age === other.age ? 0 : this.age < other.age ? -1 : 1;
    }
}

class Member extends Person {
    constructor(name: string, age: number, public role: string) {
        super(name, age);
    }
}

class Employee implements Comparable {
    constructor(public name: string, public age: number) { }

    compareTo(other: this): -1 | 0 | 1 {
        return this.age === other.age ? 0 : this.age < other.age ? -1 : 1;
    }
}

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

    it("Object.compare", () => {
        strictEqual(Object.compare("a", "b"), -1);
        strictEqual(Object.compare("b", "a"), 1);
        strictEqual(Object.compare("a", "a"), 0);

        strictEqual(Object.compare(1, 2), -1);
        strictEqual(Object.compare(2, 1), 1);
        strictEqual(Object.compare(1, 1), 0);

        if (typeof BigInt !== "undefined") {
            strictEqual(Object.compare(BigInt(1), BigInt(2)), -1);
            strictEqual(Object.compare(BigInt(2), BigInt(1)), 1);
            strictEqual(Object.compare(BigInt(1), BigInt(1)), 0);
        }

        strictEqual(Object.compare(false, true), -1);
        strictEqual(Object.compare(true, true), 0);
        strictEqual(Object.compare(true, false), 1);

        strictEqual(Object.compare(new Person("Jane", 25), new Person("John", 30)), -1);
        strictEqual(Object.compare(new Person("Jane", 25), new Person("Joe", 25)), 0);
        strictEqual(Object.compare(new Person("John", 30), new Person("Jane", 25)), 1);

        strictEqual(Object.compare(new Member("Jane", 25, "Admin"), new Member("John", 30, "User")), -1);
        strictEqual(Object.compare(new Member("Jane", 25, "Admin"), new Member("Joe", 25, "User")), 0);
        strictEqual(Object.compare(new Member("John", 30, "User"), new Member("Jane", 25, "Admin")), 1);

        strictEqual(Object.compare(new Person("Jane", 25), new Member("John", 30, "User")), -1);
        strictEqual(Object.compare(new Person("Jane", 25), new Member("Joe", 25, "User")), 0);
        strictEqual(Object.compare(new Person("John", 30), new Member("Jane", 25, "Admin")), 1);

        strictEqual(Object.compare(new Member("John", 30, "User"), new Person("Jane", 25)), 1);
        strictEqual(Object.compare(new Member("Joe", 25, "User"), new Person("Jane", 25)), 0);
        strictEqual(Object.compare(new Member("Jane", 25, "Admin"), new Person("John", 30)), -1);

        // Cannot compare different types, even they have the same structure
        const [err] = _try(() => Object.compare(new Person("Jane", 25), new Employee("John", 30)));
        strictEqual(err instanceof TypeError, true);

        strictEqual(Object.compare({
            [Symbol.toPrimitive]: () => 1,
        }, {
            [Symbol.toPrimitive]: () => 2,
        }), -1);
        strictEqual(Object.compare({
            [Symbol.toPrimitive]: () => 1,
        }, {
            [Symbol.toPrimitive]: () => 1,
        }), 0);
        strictEqual(Object.compare({
            [Symbol.toPrimitive]: () => 2,
        }, {
            [Symbol.toPrimitive]: () => 1,
        }), 1);

        strictEqual(Object.compare({
            valueOf: () => 1,
        }, {
            valueOf: () => 2,
        }), -1);
        strictEqual(Object.compare({
            valueOf: () => 1,
        }, {
            valueOf: () => 1,
        }), 0);
        strictEqual(Object.compare({
            valueOf: () => 2,
        }, {
            valueOf: () => 1,
        }), 1);
    });

    it("Object.equals", () => {
        ok(Object.equals("", ""));
        ok(Object.equals("hello", "hello"));
        ok(!Object.equals("hello", "world"));
        ok(Object.equals(new String("abc"), new String("abc")));
        ok(!Object.equals(new String("abc"), "abc"));
        ok(Object.equals(0, -0));
        ok(Object.equals(123, 123));
        ok(!Object.equals(123, 456));
        ok(Object.equals(new Number(123), new Number(123)));
        ok(!Object.equals(new Number(123), 123));
        ok(!Object.equals(123, "123"));
        ok(Object.equals(false, false));
        ok(Object.equals(true, true));
        ok(!Object.equals(true, false));
        ok(Object.equals(new Boolean(true), new Boolean(true)));
        ok(!Object.equals(new Boolean(true), true));
        ok(!Object.equals(true, 1));
        ok(!Object.equals(false, 0));
        ok(Object.equals(null, null));
        ok(Object.equals(undefined, undefined));
        ok(!Object.equals(null, undefined));
        ok(Object.equals(NaN, NaN));
        ok(Object.equals(NaN, 0 / 0));
        ok(Object.equals(Infinity, Infinity));
        ok(Object.equals(-Infinity, -Infinity));
        ok(!Object.equals(Infinity, -Infinity));
        ok(Object.equals(Symbol.toPrimitive, Symbol.toPrimitive));
        ok(!Object.equals(Symbol.toPrimitive, Symbol.iterator));
        ok(!Object.equals(Symbol("foo"), Symbol("foo")));
        ok(Object.equals(new Date("2024-01-01 00:00:00"), new Date("2024-01-01 00:00:00")));
        ok(!Object.equals(new Date("2024-01-01 00:00:00"), new Date("2024-01-01 00:00:00").valueOf()));
        ok(!Object.equals(new Date("foobar"), new Date("foobar")));

        ok(Object.equals([1, 2, 3], [1, 2, 3]));
        ok(!Object.equals([1, 2, 3], [1, 2, 4]));
        ok(!Object.equals([1, 2, 3], Object.assign([1, 2, 3], { foo: "bar" })));

        const bytes1 = new Uint8Array([1, 2, 3]);
        const bytes2 = new Uint8Array([1, 2, 3]);
        const bytes3 = new Uint8Array([1, 2, 4]);
        const bytes4 = bytes([1, 2, 3]);
        const bytes5 = new Int8Array([1, 2, 3]);
        const bytes6 = new Int8Array([1, 2, 3]);
        ok(Object.equals(bytes1, bytes2));
        ok(!Object.equals(bytes1, bytes3));
        ok(!Object.equals(bytes1, bytes4));
        ok(Object.equals(bytes4, bytes([1, 2, 3])));
        ok(!Object.equals(bytes4, Object.assign(bytes([1, 2, 4]), { foo: "bar" })));
        ok(Object.equals(bytes5, bytes6));

        ok(Object.equals(bytes1.buffer, bytes2.buffer));
        ok(!Object.equals(bytes1.buffer, bytes3.buffer));
        ok(Object.equals(bytes1.buffer, bytes4.buffer));

        const regex = /[0-9a-zA-Z]/;
        ok(Object.equals(regex, /[0-9a-zA-Z]/));
        ok(Object.equals(regex, new RegExp("[0-9a-zA-Z]")));
        ok(!Object.equals(regex, /[0-9a-z]/));
        const regex2 = /bar/g;
        regex2.test("foobar");
        ok(!Object.equals(regex2, /bar/g));

        function cloneError<T extends Error>(err: T): T {
            if (typeof structuredClone === "function") {
                return structuredClone(err);
            } else {
                return fromObject(toObject(err))!;
            }
        }

        if (!isBun) { // Bun's errors cannot be cloned properly
            const err = new Error("something went wrong");
            const err1 = cloneError(err); // make a clone
            const err2 = cloneError(err); // make another clone
            ok(Object.equals(err, err1));
            Object.assign(err1, { code: 500 });
            Object.assign(err2, { code: 500 });
            ok(Object.equals(err1, err2));
            ok(!Object.equals(err, err1));
            ok(!Object.equals(err, new Error("something went wrong")));
            ok(!Object.equals(err1, Object.assign(new Error("something went wrong"), { code: 500 })));
            ok(!Object.equals(err1, Object.assign(err2, { code: 400 })));
        }

        const map1 = new Map([["foo", "bar"], ["baz", "qux"]]);
        const map2 = new Map([["foo", "bar"], ["baz", "qux"]]);
        const map3 = new Map([["foo", "bar"], ["baz", "quux"]]);
        ok(Object.equals(map1, map2));
        ok(!Object.equals(map1, map3));
        ok(!Object.equals(map1, Object.assign(map2, { bar: "baz" })));

        const set1 = new Set(["foo", "bar", "baz"]);
        const set2 = new Set(["foo", "bar", "baz"]);
        const set3 = new Set(["foo", "bar", "qux"]);
        ok(Object.equals(set1, set2));
        ok(!Object.equals(set1, set3));
        ok(!Object.equals(set1, Object.assign(set2, { foo: "bar" })));

        ok(Object.equals(new Person("Jane", 25), new Person("Joe", 25)));
        ok(!Object.equals(new Person("Jane", 25), new Person("John", 30)));
        ok(Object.equals(new Person("Jane", 25), new Member("Jane", 25, "Admin")));
        ok(Object.equals(new Member("Jane", 25, "Admin"), new Person("Jane", 25)));
        ok(!Object.equals(new Person("Jane", 25), new Employee("Jane", 25)));

        class A {
            constructor(private value: number, readonly tag: string) { }
            [Symbol.toPrimitive](hint: "string" | "number" | "default") {
                return hint === "string" ? String(this.value) : this.value;
            }
        }
        ok(Object.equals(new A(1, "1"), new A(1, "2")));
        ok(!Object.equals(new A(1, "2"), new A(2, "2")));

        class B {
            constructor(private value: number, readonly tag: string) { }
            valueOf() {
                return this.value;
            }
        }
        ok(Object.equals(new B(1, "1"), new B(1, "2")));
        ok(!Object.equals(new B(1, "2"), new B(2, "2")));

        ok(Object.equals({}, {}));
        ok(Object.equals(Object.create(null), Object.create(null)));
        ok(!Object.equals({}, Object.create(null)));
        ok(Object.equals({ foo: "bar" }, { foo: "bar" }));
        ok(!Object.equals({ foo: "bar" }, { bar: "foo" }));
        ok(!Object.equals({ foo: "bar" }, { foo: "baz" }));
        ok(!Object.equals({ foo: "bar" }, { foo: "bar", bar: "foo" }));
        ok(!Object.equals({ foo: "bar" }, Object.assign(Object.create(null), { foo: "bar" })));

        // IMPORTANT: use `strictEqual` instead of `ok` to compare the result,
        // when failed, `ok` will cause Node.js to hang up, the reason of this
        // bug is unknown.
        strictEqual(Object.equals({
            foo: "bar",
            baz: {
                foo: "bar",
                baz: {
                    foo: "bar",
                },
                arr: [
                    "foo",
                    "bar",
                    {
                        foo: "bar",
                    },
                ],
                nil: null,
                nan: NaN,
                num: 123,
                regex: /foo/,
                date: new Date("2024-01-01 00:00:00"),
                bytes: bytes([1, 2, 3]),
                map1,
                map2: map1,
                set1,
                set2: set1,
                person1: new Person("Jane", 25),
                person2: new Person("Joe", 25),
            },
        }, {
            foo: "bar",
            baz: {
                foo: "bar",
                baz: {
                    foo: "bar",
                },
                arr: [
                    "foo",
                    "bar",
                    {
                        foo: "bar",
                    },
                ],
                regex: /foo/,
                nil: null,
                nan: NaN,
                num: 123,
                date: new Date("2024-01-01 00:00:00"),
                bytes: bytes([1, 2, 3]),
                map1,
                map2: new Map([...map1]),
                set1,
                set2: new Set([...set1]),
                person1: new Person("Jane", 25),
                person2: new Member("Joe", 25, "User"),
            },
        }), true);

        const a: Record<string, any> = {};
        a["b"] = { a };
        const b = { b: { a } };
        const x: Record<string, any> = {};
        x["y"] = { x };
        const y = { b: { a } };

        ok(Object.equals(a, b));
        ok(!Object.equals(a, x));
        ok(Object.equals(b, y));
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
            deepStrictEqual(Object.sanitize(obj, true, { removeNulls: true }), {
                name: "Hello, World!",
                str: "",
                obj: {},
                arr: ["Hello, World!", "", void 0, null, NaN, {}],
            });
            deepStrictEqual(Object.sanitize(obj, true, {
                removeNulls: true,
                removeEmptyStrings: true,
            }), {
                name: "Hello, World!",
                obj: {},
                arr: ["Hello, World!", "", void 0, null, NaN, {}],
            });
            deepStrictEqual(Object.sanitize(obj, true, {
                removeNulls: true,
                removeEmptyStrings: true,
                removeEmptyObjects: true,
            }), {
                name: "Hello, World!",
                arr: ["Hello, World!", "", void 0, null, NaN, {}],
            });
            deepStrictEqual(Object.sanitize(obj, true, {
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
            deepStrictEqual(Object.sanitize([obj], true, { removeArrayItems: true }), [{
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

    it("filterEntries", () => {
        const obj = { foo: "Hello", bar: "World" } as const;
        const result = Object.filterEntries(obj, ([key]) => key === "foo");
        deepStrictEqual(result, { foo: "Hello" });
    });

    it("mapEntries", () => {
        const obj = { foo: "Hello", bar: "World" } as const;
        const result = Object.mapEntries(obj, ([key, value]) => [key, value.toUpperCase()]);
        deepStrictEqual(result, { foo: "HELLO", bar: "WORLD" });
    });

    it("partitionEntries", () => {
        const obj = { foo: "Hello", bar: "World" };
        const result = Object.partitionEntries(obj, ([key]) => key === "foo");
        deepStrictEqual(result, [{ foo: "Hello" }, { bar: "World" }]);
    });

    it("invert", () => {
        const obj = { foo: "Hello", bar: "World" };
        const result = Object.invert(obj);
        deepStrictEqual(result, { Hello: "foo", World: "bar" });
    });
});
