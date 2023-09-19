
import { deepStrictEqual, strictEqual } from "node:assert";
import { words } from "./string/index.ts";
import jsext from "./index.ts";

describe("jsext.func", () => {
    describe("regular function", () => {
        it("success", () => {
            const logs: string[] = [];
            const text = jsext.func((defer, text: string) => {
                defer(() => void logs.push("1"));
                defer(() => void logs.push("2"));

                return text;
            })("Hello, World!");

            strictEqual(text, "Hello, World!");
            deepStrictEqual(logs, ["2", "1"]);
        });

        it("error", () => {
            const [err, text2] = jsext.try(() => jsext.func((defer, text: string) => {
                defer(() => {
                    throw new Error("something went wrong");
                });

                return text;
            })("Hello, World!"));
            deepStrictEqual(err, new Error("something went wrong"));
            strictEqual(text2, undefined);
        });

        it("as method", () => {
            const logs: string[] = [];

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
            deepStrictEqual(logs, ["Foo"]);
        });
    });

    describe("async function", () => {
        it("success", async () => {
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
        });

        it("error", async () => {
            const [err, text2] = await jsext.try(() => jsext.func(async (defer, text: string) => {
                defer(() => Promise.reject(new Error("something went wrong")));

                return await Promise.resolve(text);
            })("Hello, World!"));
            deepStrictEqual(err, new Error("something went wrong"));
            strictEqual(text2, undefined);
        });

        it("as method", async () => {
            const logs: string[] = [];

            class Foo {
                name = "Foo";

                say(word: string) {
                    return jsext.func(async function (this: Foo, defer, word: string) {
                        defer(async () => void logs.push(await Promise.resolve(this.name)));
                        return await Promise.resolve(word);
                    }).call(this, word);
                }
            }

            const text3 = await new Foo().say("bar");
            strictEqual(text3, "bar");
            deepStrictEqual(logs, ["Foo"]);
        });
    });

    it("generator function", () => {
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

    it("async generator function", async () => {
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
