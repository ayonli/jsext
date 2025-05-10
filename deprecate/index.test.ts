import { ok, strictEqual } from "node:assert";
import func from "@jsext/func";
import deprecate from "./index.ts";

describe("deprecate", () => {
    it("wrap", func(defer => {
        let warning: string = "";
        const _warn = console.warn;
        console.warn = function warn(...args) {
            warning = args.join(" ");
            _warn.call(console, ...args);
        };
        defer(() => {
            console.warn = _warn;
        });

        const sum = deprecate(function sum(a: number, b: number) {
            return a + b;
        });
        strictEqual(sum(1, 2), 3);
        ok(warning.startsWith("DeprecationWarning: sum() is deprecated"));
        ok(warning.includes("deprecate.test.ts"));

        warning = "";
        sum(2, 3);
        ok(warning.startsWith("DeprecationWarning: sum() is deprecated"));
        ok(warning.includes("deprecate.test.ts"));

        const times = deprecate(function times(a: number, b: number) {
            return a * b;
        }, "use `a * b` instead");
        strictEqual(times(1, 2), 2);
        ok(warning.startsWith("DeprecationWarning: times() is deprecated, use `a * b` instead"));
        ok(warning.includes("deprecate.test.ts"));

        warning = "";
        strictEqual(times(2, 3), 6);
        ok(warning.startsWith("DeprecationWarning: times() is deprecated, use `a * b` instead"));
        ok(warning.includes("deprecate.test.ts"));

        const pow = deprecate(function pow(a: number, b: number) {
            return a ** b;
        }, "use `a ** b` instead", true);
        strictEqual(pow(1, 2), 1);
        ok(warning.startsWith("DeprecationWarning: pow() is deprecated, use `a ** b` instead"));
        ok(warning.includes("deprecate.test.ts"));

        warning = "";
        strictEqual(pow(2, 3), 8);
        strictEqual(warning, "");
    }));

    it("explicit", func(defer => {
        let warning: string = "";
        const _warn = console.warn;
        console.warn = function warn(...args) {
            warning = args.join(" ");
            _warn.call(console, ...args);
        };
        defer(() => {
            console.warn = _warn;
        });

        function sum(a: number, b: number) {
            deprecate("sum()", sum);
            return a + b;
        }
        strictEqual(sum(1, 2), 3);
        ok(warning.startsWith("DeprecationWarning: sum() is deprecated"));
        ok(warning.includes("deprecate.test.ts"));

        warning = "";
        sum(2, 3);
        ok(warning.startsWith("DeprecationWarning: sum() is deprecated"));
        ok(warning.includes("deprecate.test.ts"));

        function times(a: number, b: number) {
            deprecate("times()", times, "use `a * b` instead");
            return a * b;
        }
        strictEqual(times(1, 2), 2);
        ok(warning.startsWith("DeprecationWarning: times() is deprecated, use `a * b` instead"));
        ok(warning.includes("deprecate.test.ts"));

        warning = "";
        strictEqual(times(2, 3), 6);
        ok(warning.startsWith("DeprecationWarning: times() is deprecated, use `a * b` instead"));
        ok(warning.includes("deprecate.test.ts"));

        function pow(a: number, b: number) {
            deprecate("pow()", pow, "use `a ** b` instead", true);
            return a ** b;
        }
        strictEqual(pow(1, 2), 1);
        ok(warning.startsWith("DeprecationWarning: pow() is deprecated, use `a ** b` instead"));
        ok(warning.includes("deprecate.test.ts"));

        warning = "";
        strictEqual(pow(2, 3), 8);
        strictEqual(warning, "");
    }));
});
