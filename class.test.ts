import { ok } from "node:assert";
import { isClass, isSubclassOf } from "./class.ts";
import { AsyncFunction, AsyncGeneratorFunction, TypedArray } from "./types.ts";

describe("class", () => {
    it("isClass", () => {
        ok(isClass(class A { }));
        ok(isClass(class { }));
        ok(isClass(Uint8Array));
        ok(isClass(Object));
        ok(isClass(Array));
        ok(isClass(Date));
        ok(isClass(Function));
        ok(isClass(AsyncFunction));
        ok(isClass(AsyncGeneratorFunction));
        ok(isClass(TypedArray));

        ok(!isClass(String));
        ok(!isClass(Number));
        ok(!isClass(Boolean));
        ok(!isClass(BigInt));
        ok(!isClass(Symbol));
        ok(!isClass(function foo() { }));
        ok(!isClass(function Foo() { }));
        ok(!isClass(() => { }));
        ok(!isClass(async () => { }));
        ok(!isClass(async function foo() { }));
        ok(!isClass(function* foo() { }));
        ok(!isClass(async function* foo() { }));
    });

    it("isSubclassOf", () => {
        class A { }
        class B extends A { }
        class C extends A { }

        ok(isSubclassOf(B, A));
        ok(isSubclassOf(A, Object));
        ok(!isSubclassOf(C, B));
    });
});
