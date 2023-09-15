import jsext from "./index";
import { words } from "./string";
import { hasOwn } from "./object";
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

    test("jsext.mixins", () => {
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

        const Bar2 = jsext.mixins(Bar, {
            log(text: string) {
                console.log(text);
            }
        });

        const bar2 = new Bar2("v0.1");
        ok(bar2 instanceof Bar);
        ok(typeof bar2.bool === "function");
        ok(typeof bar2.echo === "function");
        ok(typeof bar2.num === "function");
        ok(typeof bar2.show === "function");
        ok(typeof bar2.str === "function");
        ok(typeof bar2.log === "function");
        strictEqual(bar.ver, "v0.1");
        ok(!hasOwn(bar2, "name"));
        strictEqual(Bar2.length, 0);

        const [err] = jsext.try(() => strictEqual(bar2.name, ""));
        err && strictEqual(bar2.name, "Bar"); // old v8
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
                let conn = req.accept('echo-protocol', req.origin);

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
        test("worker_threads", async () => {
            const job1 = await jsext.run("./job.cjs", ["World"]);
            strictEqual(await job1.result(), "Hello, World");

            const job2 = await jsext.run("./job.cjs", ["World"], { fn: "greet" });
            strictEqual(await job2.result(), "Hi, World");

            const job3 = await jsext.run("./job.mjs", ["World"], { fn: "greet", });
            strictEqual(await job3.result(), "Hi, World");

            const job4 = await jsext.run<string, [string]>("./job.mjs", ["foobar"], {
                fn: "takeTooLong",
                timeout: 50,
            });
            const [err4, res4] = await jsext.try(job4.result());
            strictEqual(res4, undefined);
            deepStrictEqual(err4, new Error("operation timeout after 50ms"));

            const job5 = await jsext.run<string, [string]>("./job.mjs", ["foobar"], {
                fn: "takeTooLong",
            });
            await job5.abort();
            const [err5, res5] = await jsext.try(job5.result());
            strictEqual(res5, undefined);
            deepStrictEqual(err5, null);

            const job6 = await jsext.run<string, [string[]]>("./job.mjs", [["foo", "bar"]], {
                fn: "sequence",
            });
            const words: string[] = [];

            for await (const word of job6.iterate()) {
                words.push(word);
            }

            deepStrictEqual(words, ["foo", "bar"]);
            strictEqual(await job6.result(), "foo, bar");

            const job7 = await jsext.run("./job.cjs", ["World"], { keepAlive: true });
            strictEqual(await job7.result(), "Hello, World");

            const job8 = await jsext.run("./job.cjs", ["World"], { fn: "greet" });
            strictEqual(job8.workerId, job7.workerId);
            strictEqual(await job8.result(), "Hi, World");

            const job9 = await jsext.run("./job.cjs", ["World"]);
            ok(job8.workerId !== job9.workerId);
            strictEqual(await job9.result(), "Hello, World");
        });

        test("child_process", async () => {
            const job1 = await jsext.run("./job.cjs", ["World"], { adapter: "child_process" });
            strictEqual(await job1.result(), "Hello, World");

            const job2 = await jsext.run("./job.cjs", ["World"], {
                fn: "greet",
                adapter: "child_process",
            });
            strictEqual(await job2.result(), "Hi, World");

            const job3 = await jsext.run("./job.mjs", ["World"], {
                fn: "greet",
                adapter: "child_process",
            });
            strictEqual(await job3.result(), "Hi, World");

            const job4 = await jsext.run<string, [string]>("./job.mjs", ["foobar"], {
                fn: "takeTooLong",
                timeout: 50,
                adapter: "child_process",
            });
            const [err4, res4] = await jsext.try(job4.result());
            strictEqual(res4, undefined);
            deepStrictEqual(err4, new Error("operation timeout after 50ms"));

            const job5 = await jsext.run<string, [string]>("./job.mjs", ["foobar"], {
                fn: "takeTooLong",
                adapter: "child_process",
            });
            await job5.abort();
            const [err5, res5] = await jsext.try(job5.result());
            strictEqual(res5, undefined);
            deepStrictEqual(err5, null);

            const job6 = await jsext.run<string, [string[]]>("./job.mjs", [["foo", "bar"]], {
                fn: "sequence",
            });
            const words: string[] = [];

            for await (const word of job6.iterate()) {
                words.push(word);
            }

            deepStrictEqual(words, ["foo", "bar"]);
            strictEqual(await job6.result(), "foo, bar");

            const job7 = await jsext.run("./job.cjs", ["World"], { keepAlive: true });
            strictEqual(await job7.result(), "Hello, World");

            const job8 = await jsext.run("./job.cjs", ["World"], { fn: "greet" });
            strictEqual(job8.workerId, job7.workerId);
            strictEqual(await job8.result(), "Hi, World");

            const job9 = await jsext.run("./job.cjs", ["World"]);
            ok(job8.workerId !== job9.workerId);
            strictEqual(await job9.result(), "Hello, World");
        });
    });
});
