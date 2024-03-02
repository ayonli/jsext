import { ok } from "node:assert";
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
