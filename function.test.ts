import "./function";
import { describe, test } from "mocha";
import { deepStrictEqual, strictEqual } from "assert";

describe("Function", () => {
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

    describe("Function.try", () => {
        const EmptyStringError = new Error("the string must not be empty");

        test("regular function", () => {
            function check(str: string) {
                if (str.length === 0) {
                    throw EmptyStringError;
                }
                return str;
            }

            deepStrictEqual(Function.try(check, "Hello, World!"), [null, "Hello, World!"]);
            deepStrictEqual(Function.try(check, ""), [EmptyStringError, undefined]);
        });

        test("async function", async () => {
            async function check(str: string) {
                if (str.length === 0) {
                    throw EmptyStringError;
                }
                return await Promise.resolve(str);
            }

            deepStrictEqual(await Function.try(check, "Hello, World!"), [null, "Hello, World!"]);
            deepStrictEqual(await Function.try(check, ""), [EmptyStringError, undefined]);
        });

        test("generator function", () => {
            function* check(str: string) {
                if (str.length === 0) {
                    throw EmptyStringError;
                }

                for (let x of str) {
                    yield x;
                }

                return "OK";
            }

            const res = Function.try(check, "Hello, World!");
            const errors: Error[] = [];
            let str = "";

            while (true) {
                let { value: [err, x], done } = res.next();

                if (done) {
                    x !== undefined && (str += x);
                    break;
                } else if (err) {
                    errors.push(err);
                } else {
                    str += x;
                }
            }

            deepStrictEqual(errors, []);
            strictEqual(str, "Hello, World!OK");

            const res2 = Function.try(check(""));
            const errors2: Error[] = [];
            let str2 = "";

            while (true) {
                let { value: [err, x], done } = res2.next();

                if (done) {
                    x !== undefined && (str2 += x);
                    break;
                } else if (err) {
                    errors2.push(err);
                } else {
                    str2 += x;
                }
            }

            deepStrictEqual(errors2, [EmptyStringError]);
            strictEqual(str2, "");
        });

        test("async generator function", async () => {
            async function* check(str: string) {
                if (str.length === 0) {
                    throw EmptyStringError;
                }

                for (let x of str) {
                    yield x;
                }

                return "OK";
            }

            const res = Function.try(check, "Hello, World!");
            const errors: Error[] = [];
            let str = "";

            while (true) {
                let { value: [err, x], done } = await res.next();

                if (done) {
                    x !== undefined && (str += x);
                    break;
                } else if (err) {
                    errors.push(err);
                } else {
                    str += x;
                }
            }

            deepStrictEqual(errors, []);
            strictEqual(str, "Hello, World!OK");

            const res2 = Function.try(check(""));
            const errors2: Error[] = [];
            let str2 = "";

            while (true) {
                let { value: [err, x], done } = await res2.next();

                if (done) {
                    x !== undefined && (str2 += x);
                    break;
                } else if (err) {
                    errors2.push(err);
                } else {
                    str2 += x;
                }
            }

            deepStrictEqual(errors2, [EmptyStringError]);
            strictEqual(str2, "");
        });

        test("promise", async () => {
            async function check(str: string) {
                if (str.length === 0) {
                    throw EmptyStringError;
                }
                return await Promise.resolve(str);
            }

            deepStrictEqual(await Function.try(check("Hello, World!")), [null, "Hello, World!"]);
            deepStrictEqual(await Function.try(check("")), [EmptyStringError, undefined]);
        });

        test("pass value into generator function", () => {
            const res = Function.try(function* (str): Generator<string, string, number> {
                if (str.length === 0) {
                    throw EmptyStringError;
                }

                let count = 0;

                for (let x of str) {
                    count += yield x;
                }

                return String(count);
            }, "Hello, World!");
            const errors: Error[] = [];
            let str = "";

            while (true) {
                let { value: [err, x], done } = res.next(1);

                if (done) {
                    x !== undefined && (str += x);
                    break;
                } else if (err) {
                    errors.push(err);
                } else {
                    str += x;
                }
            }

            deepStrictEqual(errors, []);
            strictEqual(str, "Hello, World!13");
        });

        test("pass value into async generator function", async () => {
            const res = Function.try(async function* (str): AsyncGenerator<string, string, number> {
                if (str.length === 0) {
                    throw EmptyStringError;
                }

                let count = 0;

                for (let x of str) {
                    count += yield x;
                }

                return String(count);
            }, "Hello, World!");
            const errors: Error[] = [];
            let str = "";

            while (true) {
                let { value: [err, x], done } = await res.next(1);

                if (done) {
                    x !== undefined && (str += x);
                    break;
                } else if (err) {
                    errors.push(err);
                } else {
                    str += x;
                }
            }

            deepStrictEqual(errors, []);
            strictEqual(str, "Hello, World!13");
        });
    });
});
