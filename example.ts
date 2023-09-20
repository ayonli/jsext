import type { AssertionError } from "node:assert";
import type { InspectOptions } from "node:util";
import type { Ensured } from "./index.ts";

/**
 * Inspired by Golang's **Examples as Tests** design, creates a function that carries example code
 * with `// output:` comments, when the returned function is called, it will automatically check if
 * the actual output matches the one declared in the comment.
 * 
 * The example function receives a customized `console` object which will be used to log outputs
 * instead of using the built-in `console`.
 * 
 * NOTE: this function is used to simplify the process of writing tests, it does not work in Bun and
 * browsers currently, because Bun removes comments when running the program, and the function
 * relies on Node.js built-in modules.
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
export default function example<T, A extends any[] = any[]>(fn: (
    this: T,
    console: Ensured<Partial<Console>, "debug" | "dir" | "error" | "info" | "log" | "warn">,
    ...args: A
) => void | Promise<void>): (this: T, ...args: A) => Promise<void> {
    const call: { stack?: string; } = {};
    Error.captureStackTrace(call, example);

    return async function (this, ...args) {
        const fnStr = fn.toString();
        let lines = fnStr.split("\n").slice(1, -1);
        let offset = lines.findIndex(line => line.trim().toLowerCase() === "// output:");

        if (offset === -1) {
            // no output is detected, skip the function
            return;
        } else {
            offset += 1;
            lines = lines.slice(offset);
        }

        if (lines.findIndex(line => line.trim().toLowerCase() === "// output:") !== -1) {
            throw new Error("there can only be one output comment in the example");
        }

        let expected: string[] = [];

        for (let line of lines) {
            line = line.trimStart();

            if (line.startsWith("// ")) {
                expected.push(line.slice(3));
            } else {
                throw new Error("the output comment must be at the end of the example");
            }
        }

        // remove empty tailing lines
        const _expected = [...expected];
        expected = [];
        for (let i = _expected.length - 1; i >= 0; i--) {
            if (_expected[i] !== "") {
                expected.push(_expected[i] as string);
            }
        }
        expected.reverse();

        const assert = await import("node:assert");
        const util = await import("node:util");
        const logs: string[] = [];
        const log = (format: any, ...args: any[]) => {
            logs.push(util.format(format, ...args));
        };
        const _console: Ensured<Partial<Console>, "debug" | "dir" | "error" | "info" | "log" | "warn"> = {
            log,
            debug: log,
            error: log,
            info: log,
            warn: log,
            dir: (obj: any, options?: InspectOptions) => {
                logs.push(util.inspect(obj, options));
            }
        };

        const returns = fn.call(this, _console, ...args);
        const handleResult = () => {
            const actual = logs.join("\n");
            const _expected = expected.join("\n");

            try {
                // @ts-ignore
                assert.ok(actual === _expected, `\nexpected:\n${_expected}\n\ngot:\n${actual}`);
            } catch (err: unknown) {
                (err as AssertionError).stack = (err as AssertionError).stack
                    + "\n" + call.stack?.split("\n").slice(1).join("\n");
                throw err;
            }
        };

        if (typeof returns?.then === "function") {
            return returns.then(handleResult);
        } else {
            handleResult();
            return;
        }
    };
}
