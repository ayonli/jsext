import "./number";
import { test } from "mocha";
import { ok, strictEqual } from "assert";

test("Number.isFloat", () => {
    ok(Number.isFloat(1.2));
    ok(!Number.isFloat(1));
    ok(!Number.isFloat("1.2"));
    ok(!Number.isFloat("abc"));
});

test("Number.random", () => {
    strictEqual(Number.random(0, 0), 0);

    const num = Number.random(0, 10);
    ok(num >= 0 && num <= 10);
});
