import "./object";
import { describe, test } from "mocha";
import { deepStrictEqual, ok } from "assert";

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
});
