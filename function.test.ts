import "./function";
import { test } from "mocha";
import { strictEqual } from "assert";

test("Function.wrap", () => {
    function echo(text: string) {
        console.log(text);
    }
    const wrapped = Function.wrap(echo, (fn, text) => {
        fn(text);
    });

    strictEqual(wrapped.name, echo.name);
    strictEqual(wrapped.length, echo.length);
    strictEqual(wrapped.toString(), echo.toString());
});
