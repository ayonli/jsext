import jsext from "./index";
import { words } from "./string";
import { describe, test } from "mocha";
import { deepStrictEqual, strictEqual } from "assert";

describe("jsext", () => {
    test("jsext.wrap", () => {
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

    describe("jsext.try", () => {
        const EmptyStringError = new Error("the string must not be empty");

        test("regular function", () => {
            function check(str: string) {
                if (str.length === 0) {
                    throw EmptyStringError;
                }
                return str;
            }

            deepStrictEqual(jsext.try(check, "Hello, World!"), [null, "Hello, World!"]);
            deepStrictEqual(jsext.try(check, ""), [EmptyStringError, undefined]);
        });

        test("async function", async () => {
            async function check(str: string) {
                if (str.length === 0) {
                    throw EmptyStringError;
                }
                return await Promise.resolve(str);
            }

            deepStrictEqual(await jsext.try(check, "Hello, World!"), [null, "Hello, World!"]);
            deepStrictEqual(await jsext.try(check, ""), [EmptyStringError, undefined]);
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

            const res = jsext.try(check, "Hello, World!");
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

            const res2 = jsext.try(check(""));
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

            const res = jsext.try(check, "Hello, World!");
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

            const res2 = jsext.try(check(""));
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

            deepStrictEqual(await jsext.try(check("Hello, World!")), [null, "Hello, World!"]);
            deepStrictEqual(await jsext.try(check("")), [EmptyStringError, undefined]);
        });

        test("pass value into generator function", () => {
            const res = jsext.try(function* (str): Generator<string, string, number> {
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
            const res = jsext.try(async function* (str): AsyncGenerator<string, string, number> {
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

    describe("jsext.func", () => {
        test("regular function", () => {
            const logs: string[] = [];
            const text = jsext.func((defer, text: string) => {
                defer(() => void logs.push("1"));
                defer(() => void logs.push("2"));

                return text;
            })("Hello, World!");

            strictEqual(text, "Hello, World!");
            deepStrictEqual(logs, ["2", "1"]);

            const [err, text2] = jsext.try(() => jsext.func((defer, text: string) => {
                defer(() => {
                    throw new Error("something went wrong");
                });

                return text;
            })("Hello, World!"));
            deepStrictEqual(err, new Error("something went wrong"));
            strictEqual(text2, undefined);

            class Foo {
                name = "Foo";

                say(word: string) {
                    return jsext.func(function (this: Foo, defer, word: string) {
                        defer(() => void logs.push(this.name));
                        return word;
                    }).call(this, word);
                }
            }

            const text3 = new Foo().say("bar");
            strictEqual(text3, "bar");
            deepStrictEqual(logs, ["2", "1", "Foo"]);
        });

        test("async function", async () => {
            const logs: string[] = [];
            const errors: ({ error: Error | null, tag: string; })[] = [];
            const text = await jsext.func(async (defer, text: string) => {
                defer(async () => void logs.push(await Promise.resolve("1")));
                defer(async () => void logs.push(await Promise.resolve("2")));

                return await Promise.resolve(text);
            })("Hello, World!");

            strictEqual(text, "Hello, World!");
            deepStrictEqual(logs, ["2", "1"]);
            deepStrictEqual(errors, []);

            const [err, text2] = await jsext.try(() => jsext.func(async (defer, text: string) => {
                defer(() => Promise.reject(new Error("something went wrong")));

                return await Promise.resolve(text);
            })("Hello, World!"));
            deepStrictEqual(err, new Error("something went wrong"));
            strictEqual(text2, undefined);

            class Foo {
                name = "Foo";

                say(word: string) {
                    return jsext.func(async function (this: Foo, defer, word: string) {
                        defer(async () => void logs.push(await Promise.resolve(this.name)));
                        return word;
                    }).call(this, word);
                }
            }

            const text3 = await new Foo().say("bar");
            strictEqual(text3, "bar");
            deepStrictEqual(logs, ["2", "1", "Foo"]);
        });

        test("generator function", () => {
            const logs: string[] = [];
            const gen = jsext.func(function* (defer, text: string) {
                defer(() => void logs.push("1"));
                defer(() => void logs.push("2"));

                for (const word of words(text)) {
                    yield word;
                }

                return text;
            })("Hello, World!");

            while (true) {
                const { done, value } = gen.next();
                logs.push(value);

                if (done)
                    break;
            }

            deepStrictEqual(logs, ["Hello", "World", "2", "1", "Hello, World!"]);

            const logs2: string[] = [];
            const gen2 = jsext.try(jsext.func(function* (defer, text: string) {
                defer(() => void logs2.push("1"));
                defer(() => void logs2.push("2"));

                for (const word of words(text)) {
                    if (word === "World") {
                        throw new Error("something went wrong");
                    } else {
                        yield word;
                    }
                }

                return text;
            })("Hello, World!"));

            while (true) {
                const { done, value: [err, res] } = gen2.next();

                if (!err) {
                    logs2.push(res);
                }

                if (done)
                    break;
            }

            deepStrictEqual(logs2, ["Hello", "2", "1", undefined]);
        });

        test("async generator function", async () => {
            const logs: string[] = [];
            const gen = jsext.func(async function* (defer, text: string) {
                defer(async () => void logs.push(await Promise.resolve("1")));
                defer(async () => void logs.push(await Promise.resolve("2")));

                for (const word of words(text)) {
                    yield word;
                }

                return text;
            })("Hello, World!");

            while (true) {
                const { done, value } = await gen.next();
                logs.push(value);

                if (done)
                    break;
            }

            deepStrictEqual(logs, ["Hello", "World", "2", "1", "Hello, World!"]);

            const logs2: string[] = [];
            const gen2 = jsext.try(jsext.func(async function* (defer, text: string) {
                defer(async () => void logs2.push(await Promise.resolve("1")));
                defer(async () => void logs2.push(await Promise.resolve("2")));

                for (const word of words(text)) {
                    if (word === "World") {
                        throw new Error("something went wrong");
                    } else {
                        yield word;
                    }
                }

                return text;
            })("Hello, World!"));

            while (true) {
                const { done, value: [err, res] } = await gen2.next();

                if (!err) {
                    logs2.push(res);
                }

                if (done)
                    break;
            }

            deepStrictEqual(logs2, ["Hello", "2", "1", undefined]);
        });
    });
});
