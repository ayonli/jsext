import { ok } from "node:assert";
import isSubclassOf from "./isSubclassOf.ts";

describe("jsext.isSubclassOf", () => {
    it("jsext.isSubclassOf", () => {
        class A { }
        class B extends A { }
        class C extends A { }

        ok(isSubclassOf(B, A));
        ok(isSubclassOf(A, Object));
        ok(!isSubclassOf(C, B));
    });
});
