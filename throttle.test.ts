import { deepStrictEqual, ok } from "node:assert";
import { sleep } from "./promise/index.ts";
import jsext from "./index.ts";

describe("jsext.throttle", () => {
    describe("regular function", () => {
        describe("without key", () => {
            it("success", async () => {
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

            it("error", async () => {
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
            it("success", async () => {
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

            it("error", async () => {
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
            it("success", async () => {
                const fn = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), 50);
                const job1 = fn({ foo: "hello", bar: "world" });
                const job2 = fn({ foo: "hello" });

                ok(job1 instanceof Promise);
                ok(job2 instanceof Promise);
                ok(job1 === job2);

                const [res1, res2] = await Promise.all([job1, job2]);

                ok(res1 === res2);
                await sleep(60);

                const job3 = fn({ bar: "world" });
                ok(job3 instanceof Promise);

                const res3 = await job3;
                deepStrictEqual(res3, { bar: "world" });
                ok(res1 !== res3);

                await sleep(20);
                const job4 = fn({ foo: "hello", bar: "world" });
                ok(job4 instanceof Promise);
                ok(job4 === job3);
            });

            it("error", async () => {
                const fn = jsext.throttle(<T>(obj: T) => {
                    if (true) {
                        return Promise.reject(new Error("something went wrong"));
                    } else {
                        return Promise.resolve(obj);
                    }
                }, 50);
                const job1 = fn({ foo: "hello", bar: "world" });
                const job2 = fn({ foo: "hello" });

                ok(job1 instanceof Promise);
                ok(job2 instanceof Promise);
                ok(job1 === job2);

                const [[err1], [err2]] = await Promise.all([
                    jsext.try(job1),
                    jsext.try(job2),
                ]);

                deepStrictEqual(err1, new Error("something went wrong"));
                ok(err1 === err2);

                await sleep(60);

                const job3 = fn({ bar: "world" });
                ok(job3 instanceof Promise);

                const [err3] = await jsext.try(job3);
                deepStrictEqual(err3, new Error("something went wrong"));
                ok(err1 !== err3);

                await sleep(20);
                const job4 = fn({ foo: "hello", bar: "world" });
                ok(job4 instanceof Promise);
                ok(job4 === job3);
            });

            it("noWait", async () => {
                const fn = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 50,
                    noWait: true,
                });
                const job1 = fn({ foo: "hello", bar: "world" });
                ok(job1 instanceof Promise);

                const res1 = await job1;
                await sleep(60);

                const job2 = fn({ foo: "hello" });
                ok(job2 instanceof Promise);
                ok(job1 === job2);

                const res2 = await job2;
                ok(res1 === res2);

                await sleep(10);
                const job3 = fn({ bar: "world" });
                const res3 = await job3;
                deepStrictEqual(res3, { foo: "hello" });

                await sleep(20);
                const job4 = fn({ foo: "hello", bar: "world" });
                ok(job4 instanceof Promise);
                ok(job4 === job3);
            });
        });

        describe("with key", () => {
            it("success", async () => {
                const job1 = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 50,
                    for: "fooAsync",
                })({ foo: "hello", bar: "world" });
                const job2 = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 50,
                    for: "fooAsync",
                })({ foo: "hello" });

                ok(job1 instanceof Promise);
                ok(job2 instanceof Promise);
                ok(job1 === job2);

                const [res1, res2] = await Promise.all([job1, job2,]);

                ok(res1 === res2);
                await sleep(60);

                const job3 = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 50,
                    for: "fooAsync",
                })({ bar: "world" });
                const res3 = await job3;
                deepStrictEqual(res3, { bar: "world" });
                ok(res1 !== res3);

                await sleep(20);
                const job4 = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 5,
                    for: "fooAsync",
                })({ foo: "hello", bar: "world" });
                ok(job4 instanceof Promise);
                ok(job4 === job3);
            });

            it("error", async () => {
                const job1 = jsext.throttle(<T>(obj: T) => {
                    if (true) {
                        return Promise.reject(new Error("something went wrong"));
                    } else {
                        return Promise.resolve(obj);
                    }
                }, {
                    duration: 50,
                    for: "barAsync",
                })({ foo: "hello", bar: "world" });
                const job2 = jsext.throttle(<T>(obj: T) => {
                    if (true) {
                        return Promise.reject(new Error("something went wrong"));
                    } else {
                        return Promise.resolve(obj);
                    }
                }, {
                    duration: 50,
                    for: "barAsync",
                })({ foo: "hello" });

                ok(job1 instanceof Promise);
                ok(job2 instanceof Promise);
                ok(job1 === job2);

                const [[err1], [err2]] = await Promise.all([jsext.try(job1), jsext.try(job2)]);

                deepStrictEqual(err1, new Error("something went wrong"));
                ok(err1 === err2);

                await sleep(60);

                const job3 = jsext.throttle(<T>(obj: T) => {
                    if (true) {
                        return Promise.reject(new Error("something went wrong"));
                    } else {
                        return Promise.resolve(obj);
                    }
                }, {
                    duration: 50,
                    for: "barAsync",
                })({ bar: "world" });
                const [err3] = await jsext.try(job3);
                deepStrictEqual(err3, new Error("something went wrong"));
                ok(err1 !== err3);

                await sleep(20);
                const job4 = jsext.throttle(<T>(obj: T) => {
                    if (true) {
                        return Promise.reject(new Error("something went wrong"));
                    } else {
                        return Promise.resolve(obj);
                    }
                }, {
                    duration: 50,
                    for: "barAsync",
                })({ foo: "hello", bar: "world" });
                ok(job4 instanceof Promise);
                ok(job4 === job3);
            });

            it("noWait", async () => {
                const job1 = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 50,
                    for: "noWait",
                    noWait: true,
                })({ foo: "hello", bar: "world" });
                ok(job1 instanceof Promise);

                const res1 = await job1;

                await sleep(60);

                const job2 = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 50,
                    for: "noWait",
                    noWait: true,
                })({ foo: "hello" });
                ok(job2 instanceof Promise);
                ok(job1 === job2);

                const res2 = await job2;
                ok(res1 === res2);

                await sleep(10);
                const job3 = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 5,
                    for: "noWait",
                    noWait: true,
                })({ bar: "world" });
                const res3 = await job3;
                deepStrictEqual(res3, { foo: "hello" });
            });
        });
    });
});
