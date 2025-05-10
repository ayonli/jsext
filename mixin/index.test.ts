import { ok, strictEqual } from "node:assert";
import mixin from "./index.ts";
import { hasOwn } from "../object/index.ts";
import { try_ } from "@jsext/result";

describe("mixin", () => {
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

    class Bar extends mixin<typeof Foo<string>, [A, C]>(Foo, A, C) {
        show(str: string) {
            return str;
        }
    }

    const Bar2 = mixin(Bar, {
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

        const result = try_(() => strictEqual(bar2.name, ""));
        result.ok || strictEqual(bar2.name, "Bar"); // old v8
    });
});
