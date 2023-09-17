import jsext from "./index";
import { words } from "./string";
import { hasOwn } from "./object";
import { sleep } from "./promise";
import { describe, test } from "mocha";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { createReadStream } from "fs";
import * as http from "http";
import SSE from "@ayonli/sse";
import dEventSource = require("eventsource");
import { server as WebSocketServer, w3cwebsocket } from "websocket";
import EventEmitter = require("events");

describe("jsext", () => {
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
        describe("regular function", () => {
            test("success", () => {
                const logs: string[] = [];
                const text = jsext.func((defer, text: string) => {
                    defer(() => void logs.push("1"));
                    defer(() => void logs.push("2"));

                    return text;
                })("Hello, World!");

                strictEqual(text, "Hello, World!");
                deepStrictEqual(logs, ["2", "1"]);
            });

            test("error", () => {
                const [err, text2] = jsext.try(() => jsext.func((defer, text: string) => {
                    defer(() => {
                        throw new Error("something went wrong");
                    });

                    return text;
                })("Hello, World!"));
                deepStrictEqual(err, new Error("something went wrong"));
                strictEqual(text2, undefined);
            });

            test("as method", () => {
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
            test("success", async () => {
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

            test("error", async () => {
                const [err, text2] = await jsext.try(() => jsext.func(async (defer, text: string) => {
                    defer(() => Promise.reject(new Error("something went wrong")));

                    return await Promise.resolve(text);
                })("Hello, World!"));
                deepStrictEqual(err, new Error("something went wrong"));
                strictEqual(text2, undefined);
            });

            test("as method", async () => {
                const logs: string[] = [];

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
                deepStrictEqual(logs, ["Foo"]);
            });
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

    describe("jsext.throttle", () => {
        describe("regular function", () => {
            describe("without key", () => {
                test("success", async () => {
                    const fn = jsext.throttle(<T>(obj: T) => obj, 5);
                    const res1 = fn({ foo: "hello", bar: "world" });
                    const res2 = fn({ foo: "hello" });

                    deepStrictEqual(res1, { foo: "hello", bar: "world" });
                    ok(res1 === res2);
                    await sleep(6);

                    const res3 = fn({ bar: "world" });
                    deepStrictEqual(res3, { bar: "world" });
                    ok(res1 !== res3);
                });

                test("error", async () => {
                    const fn = jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            throw new Error("something went wrong");
                        } else {
                            return obj;
                        }
                    }, 5);
                    const [err1] = jsext.try(() => fn({ foo: "hello", bar: "world" }));
                    const [err2] = jsext.try(() => fn({ foo: "hello" }));

                    deepStrictEqual(err1, new Error("something went wrong"));
                    ok(err1 === err2);

                    await sleep(6);

                    const [err3] = jsext.try(() => fn({ bar: "world" }));
                    deepStrictEqual(err3, new Error("something went wrong"));
                    ok(err1 !== err3);
                });
            });

            describe("with key", () => {
                test("success", async () => {
                    const res1 = jsext.throttle(<T>(obj: T) => obj, {
                        duration: 5,
                        for: "foo",
                    })({ foo: "hello", bar: "world" });
                    const res2 = jsext.throttle(<T>(obj: T) => obj, {
                        duration: 5,
                        for: "foo",
                    })({ foo: "hello" });

                    deepStrictEqual(res1, { foo: "hello", bar: "world" });
                    ok(res1 === res2);
                    await sleep(6);

                    const res3 = jsext.throttle(<T>(obj: T) => obj, {
                        duration: 5,
                        for: "foo",
                    })({ bar: "world" });
                    deepStrictEqual(res3, { bar: "world" });
                    ok(res1 !== res3);
                });

                test("error", async () => {
                    const [err1] = jsext.try(() => jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            throw new Error("something went wrong");
                        } else {
                            return obj;
                        }
                    }, {
                        duration: 5,
                        for: "bar",
                    })({ foo: "hello", bar: "world" }));
                    const [err2] = jsext.try(() => jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            throw new Error("something went wrong");
                        } else {
                            return obj;
                        }
                    }, {
                        duration: 5,
                        for: "bar",
                    })({ foo: "hello" }));

                    deepStrictEqual(err1, new Error("something went wrong"));
                    ok(err1 === err2);

                    await sleep(6);

                    const [err3] = jsext.try(() => jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            throw new Error("something went wrong");
                        } else {
                            return obj;
                        }
                    }, {
                        duration: 5,
                        for: "bar",
                    })({ bar: "world" }));
                    deepStrictEqual(err3, new Error("something went wrong"));
                    ok(err1 !== err3);
                });
            });
        });

        describe("async function", () => {
            describe("without key", () => {
                test("success", async () => {
                    const fn = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), 5);
                    const [res1, res2] = await Promise.all([
                        fn({ foo: "hello", bar: "world" }),
                        fn({ foo: "hello" }),
                    ]);

                    ok(res1 === res2);
                    await sleep(6);

                    const res3 = await fn({ bar: "world" });
                    deepStrictEqual(res3, { bar: "world" });
                    ok(res1 !== res3);
                });

                test("error", async () => {
                    const fn = jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            return Promise.reject(new Error("something went wrong"));
                        } else {
                            return Promise.resolve(obj);
                        }
                    }, 5);
                    const [[err1], [err2]] = await Promise.all([
                        jsext.try(fn({ foo: "hello", bar: "world" })),
                        jsext.try(fn({ foo: "hello" })),
                    ]);

                    deepStrictEqual(err1, new Error("something went wrong"));
                    ok(err1 === err2);

                    await sleep(6);

                    const [err3] = await jsext.try(fn({ bar: "world" }));
                    deepStrictEqual(err3, new Error("something went wrong"));
                    ok(err1 !== err3);
                });
            });

            describe("with key", () => {
                test("success", async () => {
                    const [res1, res2] = await Promise.all([
                        jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                            duration: 5,
                            for: "foo",
                        })({ foo: "hello", bar: "world" }),
                        jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                            duration: 5,
                            for: "foo",
                        })({ foo: "hello" }),
                    ]);

                    ok(res1 === res2);
                    await sleep(6);

                    const res3 = await jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                        duration: 5,
                        for: "foo",
                    })({ bar: "world" });
                    deepStrictEqual(res3, { bar: "world" });
                    ok(res1 !== res3);
                });

                test("error", async () => {
                    const [[err1], [err2]] = await Promise.all([
                        jsext.try(jsext.throttle(<T>(obj: T) => {
                            if (true) {
                                return Promise.reject(new Error("something went wrong"));
                            } else {
                                return Promise.resolve(obj);
                            }
                        }, {
                            duration: 5,
                            for: "bar",
                        })({ foo: "hello", bar: "world" })),
                        jsext.try(jsext.throttle(<T>(obj: T) => {
                            if (true) {
                                return Promise.reject(new Error("something went wrong"));
                            } else {
                                return Promise.resolve(obj);
                            }
                        }, {
                            duration: 5,
                            for: "bar",
                        })({ foo: "hello" })),
                    ]);

                    deepStrictEqual(err1, new Error("something went wrong"));
                    ok(err1 === err2);

                    await sleep(6);

                    const [err3] = await jsext.try(jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            return Promise.reject(new Error("something went wrong"));
                        } else {
                            return Promise.resolve(obj);
                        }
                    }, {
                        duration: 5,
                        for: "bar",
                    })({ bar: "world" }));
                    deepStrictEqual(err3, new Error("something went wrong"));
                    ok(err1 !== err3);
                });
            });
        });
    });

    describe("jsext.mixins", () => {
        class A {
            get name() {
                return this.constructor.name;
            }

            str() {
                return "";
            }
        }

        class B {
            num() {
                return 0;
            }
        }

        class C extends B {
            bool() {
                return false;
            }
        }

        class Foo<T> {
            constructor(readonly ver: T) { }

            echo(text: string) {
                return text;
            }
        }

        class Bar extends jsext.mixins<typeof Foo<string>, [A, C]>(Foo, A, C) {
            show(str: string) {
                return str;
            }
        }

        const Bar2 = jsext.mixins(Bar, {
            log(text: string) {
                console.log(text);
            }
        });

        test("class constructor", () => {
            const bar = new Bar("v0.1");
            ok(typeof bar.bool === "function");
            ok(typeof bar.echo === "function");
            ok(typeof bar.num === "function");
            ok(typeof bar.show === "function");
            ok(typeof bar.str === "function");
            strictEqual(bar.ver, "v0.1");
            ok(!hasOwn(bar, "name"));
            strictEqual(Bar.length, 0);
            strictEqual(bar.name, "Bar");

            const proto = Object.getPrototypeOf(bar);
            strictEqual(proto, Bar.prototype);
            ok(typeof proto.bool === "function");
            ok(typeof proto.echo === "function");
            ok(typeof proto.num === "function");
            ok(typeof proto.show === "function");
            ok(typeof proto.str === "function");
        });

        test("object literal", () => {
            const bar2 = new Bar2("v0.1");
            ok(bar2 instanceof Bar);
            ok(typeof bar2.bool === "function");
            ok(typeof bar2.echo === "function");
            ok(typeof bar2.num === "function");
            ok(typeof bar2.show === "function");
            ok(typeof bar2.str === "function");
            ok(typeof bar2.log === "function");
            strictEqual(bar2.ver, "v0.1");
            ok(!hasOwn(bar2, "name"));
            strictEqual(Bar2.length, 0);

            const [err] = jsext.try(() => strictEqual(bar2.name, ""));
            err && strictEqual(bar2.name, "Bar"); // old v8
        });
    });

    test("jsext.isSubclassOf", () => {
        class A { }
        class B extends A { }
        class C extends A { }

        ok(jsext.isSubclassOf(B, A));
        ok(jsext.isSubclassOf(A, Object));
        ok(!jsext.isSubclassOf(C, B));
    });

    describe("jsext.read", () => {
        test("ReadableStream", async () => {
            const file = createReadStream("./package.json");
            const chunks: Buffer[] = [];

            for await (const chunk of jsext.read(file)) {
                chunks.push(chunk as Buffer);
            }

            ok(chunks.length > 0);
        });

        test("EventSource", jsext.func(async (defer) => {
            const server = http.createServer((req, res) => {
                if (!SSE.isEventSource(req)) {
                    res.end();
                    return;
                }

                const sse = new SSE(req, res);

                if (req.url === "/message") {
                    sse.send("hello");
                    sse.send("world");
                } else if (req.url === "/event") {
                    sse.emit("reply", "foo");
                    sse.emit("reply", "bar");
                } else {
                    res.end();
                }
            }).listen(12345);
            defer(() => new Promise(resolve => {
                server.closeAllConnections?.();
                server.close(resolve);
            }));

            const es1 = new dEventSource("http://localhost:12345/message") as EventSource;
            const messages: string[] = [];

            for await (const msg of jsext.read(es1)) {
                messages.push(msg);

                if (messages.length === 2) {
                    es1.close();
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);

            const es2 = new dEventSource("http://localhost:12345/event") as EventSource;
            const replies: string[] = [];

            for await (const reply of jsext.read(es2, { event: "reply" })) {
                replies.push(reply);

                if (replies.length === 2) {
                    es2.close();
                }
            }

            deepStrictEqual(replies, ["foo", "bar"]);
        }));

        test("WebSocket", jsext.func(async (defer) => {
            let server = http.createServer().listen(12345);
            let wsServer = new WebSocketServer({
                httpServer: server
            });
            defer(() => new Promise(resolve => {
                server.closeAllConnections?.();
                server.close(resolve);
            }));

            wsServer.on("request", async req => {
                let conn = req.accept("echo-protocol", req.origin);

                for (let msg of ["hello", "world"]) {
                    conn.send(msg);
                }
            });

            const ws = new w3cwebsocket(
                "ws://localhost:12345",
                "echo-protocol") as unknown as WebSocket;
            const messages: string[] = [];

            for await (const msg of jsext.read<string>(ws)) {
                messages.push(msg);

                if (messages.length === 2) {
                    ws.close();
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);
        }));

        test("EventTarget", async () => {
            if (parseInt(process.version.slice(1)) < 15) {
                // EventTarget is available after Node.js v15
                return;
            }

            const target1 = new EventTarget();
            const messages: string[] = [];

            (async () => {
                await Promise.resolve(null);
                target1.dispatchEvent(new MessageEvent("message", { data: "hello" }));
                target1.dispatchEvent(new MessageEvent("message", { data: "world" }));
            })();

            for await (const msg of jsext.read<string>(target1)) {
                messages.push(msg);

                if (messages.length === 2) {
                    target1.dispatchEvent(new Event("close"));
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);

            const target2 = new EventTarget();
            const messages2: string[] = [];

            (async () => {
                await Promise.resolve(null);
                target2.dispatchEvent(new MessageEvent("reply", { data: "foo" }));
                target2.dispatchEvent(new MessageEvent("reply", { data: "bar" }));
            })();

            for await (const msg of jsext.read<string>(target2, {
                message: "reply",
                close: "end",
            })) {
                messages2.push(msg);

                if (messages2.length === 2) {
                    target2.dispatchEvent(new Event("end"));
                }
            }

            deepStrictEqual(messages2, ["foo", "bar"]);
        });

        test("EventEmitter", async () => {
            const target1 = new EventEmitter();
            const messages: string[] = [];

            (async () => {
                await Promise.resolve(null);
                target1.emit("data", "hello");
                target1.emit("data", "world");
            })();

            for await (const msg of jsext.read<string>(target1)) {
                messages.push(msg);

                if (messages.length === 2) {
                    target1.emit("close");
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);

            const target2 = new EventEmitter();
            const messages2: string[] = [];

            (async () => {
                await Promise.resolve(null);
                target2.emit("reply", "foo");
                target2.emit("reply", "bar");
            })();

            for await (const msg of jsext.read<string>(target2, {
                data: "reply",
                close: "end",
            })) {
                messages2.push(msg);

                if (messages2.length === 2) {
                    target2.emit("end");
                }
            }

            deepStrictEqual(messages2, ["foo", "bar"]);
        });
    });

    describe("jsext.run", () => {
        describe("worker_threads", () => {
            test("CommonJS", async () => {
                const job = await jsext.run("job-example.js", ["World"]);
                strictEqual(await job.result(), "Hello, World");
            });

            test("ES Module", async () => {
                const job = await jsext.run("./job-example.mjs", ["World"]);
                strictEqual(await job.result(), "Hello, World");
            });

            test("custom function", async () => {
                const job = await jsext.run("job-example.mjs", ["World"], { fn: "greet" });
                strictEqual(await job.result(), "Hi, World");
            });

            test("timeout", async () => {
                const job = await jsext.run<string, [string]>("job-example.mjs", ["foobar"], {
                    fn: "takeTooLong",
                    timeout: 50,
                });
                const [err, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                deepStrictEqual(err, new Error("operation timeout after 50ms"));
            });

            test("abort", async () => {
                const job = await jsext.run<string, [string]>("job-example.mjs", ["foobar"], {
                    fn: "takeTooLong",
                });
                await job.abort();
                const [err, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                deepStrictEqual(err, null);
            });

            test("iterate", async () => {
                const job = await jsext.run<string, [string[]]>("job-example.mjs", [["foo", "bar"]], {
                    fn: "sequence",
                });
                const words: string[] = [];

                for await (const word of job.iterate()) {
                    words.push(word);
                }

                deepStrictEqual(words, ["foo", "bar"]);
                strictEqual(await job.result(), "foo, bar");
            });

            test("keep alive", async () => {
                const job1 = await jsext.run("job-example.mjs", ["World"], { keepAlive: true });
                strictEqual(await job1.result(), "Hello, World");

                const job2 = await jsext.run("job-example.mjs", ["World"], { fn: "greet" });
                strictEqual(job2.workerId, job1.workerId);
                strictEqual(await job2.result(), "Hi, World");

                const job3 = await jsext.run("job-example.mjs", ["World"]);
                ok(job2.workerId !== job3.workerId);
                strictEqual(await job3.result(), "Hello, World");
            });
        });

        describe("child_process", async () => {
            test("CommonJS", async () => {
                const job = await jsext.run("job-example.js", ["World"], {
                    adapter: "child_process",
                });
                strictEqual(await job.result(), "Hello, World");
            });

            test("ES Module", async () => {
                const job = await jsext.run("./job-example.mjs", ["World"], {
                    adapter: "child_process",
                });
                strictEqual(await job.result(), "Hello, World");
            });

            test("custom function", async () => {
                const job = await jsext.run("job-example.mjs", ["World"], {
                    fn: "greet",
                    adapter: "child_process",
                });
                strictEqual(await job.result(), "Hi, World");
            });

            test("timeout", async () => {
                const job = await jsext.run<string, [string]>("job-example.mjs", ["foobar"], {
                    fn: "takeTooLong",
                    timeout: 50,
                    adapter: "child_process",
                });
                const [err, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                deepStrictEqual(err, new Error("operation timeout after 50ms"));
            });

            test("abort", async () => {
                const job = await jsext.run<string, [string]>("job-example.mjs", ["foobar"], {
                    fn: "takeTooLong",
                    adapter: "child_process",
                });
                await job.abort();
                const [err, res] = await jsext.try(job.result());
                strictEqual(res, undefined);
                deepStrictEqual(err, null);
            });

            test("iterate", async () => {
                const job = await jsext.run<string, [string[]]>("job-example.mjs", [["foo", "bar"]], {
                    fn: "sequence",
                });
                const words: string[] = [];

                for await (const word of job.iterate()) {
                    words.push(word);
                }

                deepStrictEqual(words, ["foo", "bar"]);
                strictEqual(await job.result(), "foo, bar");
            });

            test("keep alive", async () => {
                const job1 = await jsext.run("job-example.mjs", ["World"], { keepAlive: true });
                strictEqual(await job1.result(), "Hello, World");

                const job2 = await jsext.run("job-example.mjs", ["World"], { fn: "greet" });
                strictEqual(job2.workerId, job1.workerId);
                strictEqual(await job2.result(), "Hi, World");

                const job3 = await jsext.run("job-example.mjs", ["World"]);
                ok(job2.workerId !== job3.workerId);
                strictEqual(await job3.result(), "Hello, World");
            });
        });
    });
});
