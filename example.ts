import type { AssertionError } from "node:assert";

declare var Deno: any;

/**
 * Inspired by Golang's **Example as Test** design, creates a function that carries example code
 * with `// output:` comments, when the returned function is called, it will automatically check if
 * the actual output matches the one declared in the comment.
 * 
 * The example function receives a customized `console` object which will be used to log outputs
 * instead of using the built-in `console`.
 * 
 * NOTE: this function is used to simplify the process of writing tests, it does not work in Bun and
 * browsers currently, because Bun hasn't implement the `Console` constructor and removes comments
 * during runtime, and the function relies on Node.js built-in modules.
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
export default function example<T, A extends any[] = any[]>(
    fn: (this: T, console: Console, ...args: A) => void | Promise<void>,
    options: {
        /** Suppress logging to the terminal and only check the output. */
        suppress?: boolean;
    } | undefined = undefined
): (this: T, ...args: A) => Promise<void> {
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

            if (line.startsWith("//")) {
                if (line[2] && line[2] !== " ") {
                    throw new Error("the output comment must start with '// '");
                }

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
        const { Writable } = await import("node:stream");
        const { Console } = await import("node:console");
        const logs: Uint8Array[] = [];
        const decoder = new TextDecoder();
        const stdout = new Writable({
            write(chunk, _, callback) {
                logs.push(chunk);
                // const str = decoder.decode(chunk);
                // const lines = str.split("\n");

                // lines.forEach((line, i) => {
                //     if (line || i !== lines.length - 1) {
                //         logs.push(line);
                //     }
                // });

                callback();
            },
        });
        const _console = new Console(stdout);
        const returns = fn.call(this, _console, ...args);
        const handleResult = async () => {
            const actual = logs.map(chunk => decoder.decode(chunk)).join("\n").replace(/[\n]+$/, "");
            const _expected = expected.join("\n");

            try {
                // @ts-ignore
                assert.ok(actual === _expected, `\nexpected:\n${_expected}\n\ngot:\n${actual}`);

                if (!options?.suppress) {
                    for (const chunk of logs) {
                        if (typeof Deno === "object") {
                            await Deno.stdout.write(chunk);
                        } else if (typeof process === "object") {
                            await new Promise<void>(
                                resolve => process.stdout.write(chunk, () => resolve())
                            );
                        }
                    }
                }
            } catch (err: unknown) {
                Object.defineProperty(err as AssertionError, "stack", {
                    configurable: true,
                    writable: true,
                    enumerable: false,
                    value: (err as AssertionError).stack
                        + "\n" + call.stack?.split("\n").slice(1).join("\n"),
                });

                throw err;
            }
        };

        if (typeof returns?.then === "function") {
            await returns;
        }

        await new Promise<void>(resolve => stdout.end(() => resolve()));
        await handleResult();
    };
}
