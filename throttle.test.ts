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

            it("error", async () => {
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

            it("noWait", async () => {
                const fn = jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 5,
                    noWait: true,
                });
                const res1 = await fn({ foo: "hello", bar: "world" });

                await sleep(6);
                const res2 = await fn({ foo: "hello" });
                ok(res1 === res2);

                await sleep(1);
                const res3 = await fn({ bar: "world" });
                deepStrictEqual(res3, { foo: "hello" });
            });
        });

        describe("with key", () => {
            it("success", async () => {
                const [res1, res2] = await Promise.all([
                    jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                        duration: 5,
                        for: "fooAsync",
                    })({ foo: "hello", bar: "world" }),
                    jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                        duration: 5,
                        for: "fooAsync",
                    })({ foo: "hello" }),
                ]);

                ok(res1 === res2);
                await sleep(6);

                const res3 = await jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 5,
                    for: "fooAsync",
                })({ bar: "world" });
                deepStrictEqual(res3, { bar: "world" });
                ok(res1 !== res3);
                await sleep(6);
            });

            it("error", async () => {
                const [[err1], [err2]] = await Promise.all([
                    jsext.try(jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            return Promise.reject(new Error("something went wrong"));
                        } else {
                            return Promise.resolve(obj);
                        }
                    }, {
                        duration: 5,
                        for: "barAsync",
                    })({ foo: "hello", bar: "world" })),
                    jsext.try(jsext.throttle(<T>(obj: T) => {
                        if (true) {
                            return Promise.reject(new Error("something went wrong"));
                        } else {
                            return Promise.resolve(obj);
                        }
                    }, {
                        duration: 5,
                        for: "barAsync",
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
                    for: "barAsync",
                })({ bar: "world" }));
                deepStrictEqual(err3, new Error("something went wrong"));
                ok(err1 !== err3);
            });

            it("noWait", async () => {
                const res1 = await jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 5,
                    for: "noWait",
                    noWait: true,
                })({ foo: "hello", bar: "world" });

                await sleep(6);
                const res2 = await jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 5,
                    for: "noWait",
                    noWait: true,
                })({ foo: "hello" });
                ok(res1 === res2);

                await sleep(1);
                const res3 = await jsext.throttle(<T>(obj: T) => Promise.resolve(obj), {
                    duration: 5,
                    for: "noWait",
                    noWait: true,
                })({ bar: "world" });
                deepStrictEqual(res3, { foo: "hello" });
            });
        });
    });
});
