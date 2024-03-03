import { ok, strictEqual } from "node:assert";
import { hasOwn } from "./object/index.ts";
import jsext, { AsyncFunction, AsyncGeneratorFunction } from "./index.ts";

describe("jsext.isClass", () => {
    it("true", () => {
        ok(jsext.isClass(class A { }));
        ok(jsext.isClass(class { }));
        ok(jsext.isClass(Uint8Array));
        ok(jsext.isClass(Object));
        ok(jsext.isClass(Array));
        ok(jsext.isClass(Date));
        ok(jsext.isClass(Function));
        ok(jsext.isClass(AsyncFunction));
        ok(jsext.isClass(AsyncGeneratorFunction));
    });

    it("false", () => {
        ok(!jsext.isClass(String));
        ok(!jsext.isClass(Number));
        ok(!jsext.isClass(Boolean));
        ok(!jsext.isClass(BigInt));
        ok(!jsext.isClass(Symbol));
        ok(!jsext.isClass(function foo() { }));
        ok(!jsext.isClass(function Foo() { }));
        ok(!jsext.isClass(() => { }));
        ok(!jsext.isClass(async () => { }));
        ok(!jsext.isClass(async function foo() { }));
        ok(!jsext.isClass(function* foo() { }));
        ok(!jsext.isClass(async function* foo() { }));
    });
});

describe("jsext.isSubclassOf", () => {
    it("jsext.isSubclassOf", () => {
        class A { }
        class B extends A { }
        class C extends A { }

        ok(jsext.isSubclassOf(B, A));
        ok(jsext.isSubclassOf(A, Object));
        ok(!jsext.isSubclassOf(C, B));
    });
});

describe("jsext.mixin", () => {
    class A {
        get name() {
            return this.constructor.name;
        }

        str() {
            return "";
        }
    }

    class B {
        num() {
            return 0;
        }
    }

    class C extends B {
        bool() {
            return false;
        }
    }

    class Foo<T> {
        constructor(readonly ver: T) { }

        echo(text: string) {
            return text;
        }
    }

    class Bar extends jsext.mixin<typeof Foo<string>, [A, C]>(Foo, A, C) {
        show(str: string) {
            return str;
        }
    }

    const Bar2 = jsext.mixin(Bar, {
        log(text: string) {
            console.log(text);
        }
    });

    it("class constructor", () => {
        const bar = new Bar("v0.1");
        ok(typeof bar.bool === "function");
        ok(typeof bar.echo === "function");
        ok(typeof bar.num === "function");
        ok(typeof bar.show === "function");
        ok(typeof bar.str === "function");
        strictEqual(bar.ver, "v0.1");
        ok(!hasOwn(bar, "name"));
        strictEqual(Bar.length, 0);
        strictEqual(bar.name, "Bar");

        const proto = Object.getPrototypeOf(bar);
        strictEqual(proto, Bar.prototype);
        ok(typeof proto.bool === "function");
        ok(typeof proto.echo === "function");
        ok(typeof proto.num === "function");
        ok(typeof proto.show === "function");
        ok(typeof proto.str === "function");
    });

    it("object literal", () => {
        const bar2 = new Bar2("v0.1");
        ok(bar2 instanceof Bar);
        ok(typeof bar2.bool === "function");
        ok(typeof bar2.echo === "function");
        ok(typeof bar2.num === "function");
        ok(typeof bar2.show === "function");
        ok(typeof bar2.str === "function");
        ok(typeof bar2.log === "function");
        strictEqual(bar2.ver, "v0.1");
        ok(!hasOwn(bar2, "name"));
        strictEqual(Bar2.length, 0);

        const [err] = jsext.try(() => strictEqual(bar2.name, ""));
        err && strictEqual(bar2.name, "Bar"); // old v8
    });
});
