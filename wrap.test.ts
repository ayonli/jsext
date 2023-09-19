import { strictEqual } from "node:assert";
import jsext from "./index.ts";


it("jsext.wrap", () => {
    function echo(text: string) {
        console.log(text);
    }
    const wrapped = jsext.wrap(echo, (fn, text) => {
        fn(text);
    });

    strictEqual(wrapped.name, echo.name);
    strictEqual(wrapped.length, echo.length);
    strictEqual(wrapped.toString(), echo.toString());
});
