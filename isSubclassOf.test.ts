import { ok } from "node:assert";
import jsext from "./index.ts";

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
