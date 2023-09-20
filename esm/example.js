/**
 * Inspired by Golang's **Example as Test** design, creates a function that carries example code
 * with `// output:` comments, when the returned function is called, it will automatically check if
 * the actual output matches the one declared in the comment.
 *
 * The example function receives a customized `console` object which will be used to log outputs
 * instead of using the built-in `console`.
 *
 * NOTE: this function is used to simplify the process of writing tests, it does not work in Bun and
 * browsers currently, because Bun removes comments during runtime, and the function relies on
 * Node.js built-in modules.
 *
 * @experimental
 *
 * @example
 *  it("should output as expected", example(console => {
 *      console.log("Hello, World!");
 *      // output:
 *      // Hello, World!
 *  }));
 */
function example(fn) {
    const call = {};
    Error.captureStackTrace(call, example);
    return async function (...args) {
        const fnStr = fn.toString();
        let lines = fnStr.split("\n").slice(1, -1);
        let offset = lines.findIndex(line => line.trim().toLowerCase() === "// output:");
        if (offset === -1) {
            // no output is detected, skip the function
            return;
        }
        else {
            offset += 1;
            lines = lines.slice(offset);
        }
        if (lines.findIndex(line => line.trim().toLowerCase() === "// output:") !== -1) {
            throw new Error("there can only be one output comment in the example");
        }
        let expected = [];
        for (let line of lines) {
            line = line.trimStart();
            if (line.startsWith("// ")) {
                expected.push(line.slice(3));
            }
            else {
                throw new Error("the output comment must be at the end of the example");
            }
        }
        // remove empty tailing lines
        const _expected = [...expected];
        expected = [];
        for (let i = _expected.length - 1; i >= 0; i--) {
            if (_expected[i] !== "") {
                expected.push(_expected[i]);
            }
        }
        expected.reverse();
        const assert = await import('node:assert');
        const util = await import('node:util');
        const logs = [];
        const log = (format, ...args) => {
            logs.push(util.format(format, ...args));
        };
        const _console = {
            log,
            debug: log,
            error: log,
            info: log,
            warn: log,
            dir: (obj, options) => {
                logs.push(util.inspect(obj, options));
            }
        };
        const returns = fn.call(this, _console, ...args);
        const handleResult = () => {
            var _a;
            const actual = logs.join("\n");
            const _expected = expected.join("\n");
            try {
                // @ts-ignore
                assert.ok(actual === _expected, `\nexpected:\n${_expected}\n\ngot:\n${actual}`);
            }
            catch (err) {
                err.stack = err.stack
                    + "\n" + ((_a = call.stack) === null || _a === void 0 ? void 0 : _a.split("\n").slice(1).join("\n"));
                throw err;
            }
        };
        if (typeof (returns === null || returns === void 0 ? void 0 : returns.then) === "function") {
            return returns.then(handleResult);
        }
        else {
            handleResult();
            return;
        }
    };
}

export { example as default };
//# sourceMappingURL=example.js.map
