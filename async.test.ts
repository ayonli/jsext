import "./augment.ts";
import jsext from "./index.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { asyncTask, abortable, sleep } from "./async.ts";
import { isNodeBelow16 } from "./env.ts";
import { as } from "./object.ts";

describe("async", () => {
    describe("asyncTask", () => {
        it("resolve", async () => {
            const task = asyncTask<number>();
            task.resolve(1);
            strictEqual(await task, 1);
        });

        it("reject", async () => {
            const task = asyncTask<number>();
            task.reject(new Error("error"));
            const [err, res] = await jsext.try(task);
            strictEqual(res, undefined);
            deepStrictEqual(err, new Error("error"));
        });
    });

    describe("abortable", () => {
        if (typeof AbortController === "undefined") {
            return;
        }

        describe("Promise", () => {
            it("already aborted", async () => {
                const controller = new AbortController();
                controller.abort();

                let timer: NodeJS.Timeout | number | undefined;
                const job = new Promise<number>((resolve) => {
                    timer = setTimeout(() => {
                        resolve(1);
                    }, 100);
                });

                const [err, res] = await jsext.try(abortable(job, controller.signal));

                timer && clearTimeout(timer);
                strictEqual(res, undefined);
                deepStrictEqual(err, controller.signal.reason);
            });

            it("abort before resolve", async () => {
                const controller = new AbortController();

                let timer: NodeJS.Timeout | number | undefined;
                const job = new Promise<number>((resolve) => {
                    timer = setTimeout(() => {
                        resolve(1);
                    }, 100);
                });

                setTimeout(() => {
                    controller.abort();
                }, 50);

                const [err, res] = await jsext.try(abortable(job, controller.signal));

                timer && clearTimeout(timer);
                strictEqual(res, undefined);
                deepStrictEqual(err, controller.signal.reason);
            });

            it("abort after resolve", async () => {
                const controller = new AbortController();
                const job = new Promise<number>((resolve) => {
                    setTimeout(() => {
                        resolve(1);
                    }, 50);
                });

                const timer = setTimeout(() => {
                    controller.abort();
                }, 100);

                const [err, res] = await jsext.try(abortable(job, controller.signal));

                clearTimeout(timer);
                strictEqual(res, 1);
                strictEqual(err, null);
            });
        });

        describe("AsyncIterable", () => {
            it("already aborted", async () => {
                const controller = new AbortController();
                controller.abort();

                const job = async function* () {
                    for (const value of [1, 2, 3]) {
                        yield value;
                        await sleep(50);
                    }
                };

                const result: number[] = [];
                const [err] = await jsext.try(async () => {
                    for await (const value of abortable(job(), controller.signal)) {
                        result.push(value);
                    }
                });

                deepStrictEqual(result, []);
                deepStrictEqual(err, controller.signal.reason);
            });

            it("abort before finish", async () => {
                const controller = new AbortController();
                const job = async function* () {
                    for (const value of [1, 2, 3]) {
                        yield value;
                        await sleep(50);
                    }
                };

                setTimeout(() => {
                    controller.abort();
                }, 80);

                const result: number[] = [];
                const [err] = await jsext.try(async () => {
                    for await (const value of abortable(job(), controller.signal)) {
                        result.push(value);
                    }
                });

                deepStrictEqual(result, [1, 2]);
                deepStrictEqual(err, controller.signal.reason);
            });

            it("abort after finish", async () => {
                const controller = new AbortController();
                const job = async function* () {
                    for (const value of [1, 2, 3]) {
                        yield value;
                    }
                };

                const timer = setTimeout(() => {
                    controller.abort();
                }, 100);

                const result: number[] = [];
                const [err] = await jsext.try(async () => {
                    for await (const value of abortable(job(), controller.signal)) {
                        result.push(value);
                    }
                });

                clearTimeout(timer);
                deepStrictEqual(result, [1, 2, 3]);
                strictEqual(err, null);
            });
        });
    });

    it("timeout", async () => {
        const res1 = await Promise.timeout(Promise.resolve(1), 50);

        strictEqual(res1, 1);

        const job = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 100);
        });
        const [err, res2] = await jsext.try(Promise.timeout(job, 50));
        strictEqual(res2, undefined);
        deepStrictEqual(as(err, Error)?.message, "operation timeout after 50ms");
    });

    it("after", async () => {
        let startTime = Date.now();
        const res1 = await Promise.after(Promise.resolve(1), 50);
        const duration = Date.now() - startTime;

        strictEqual(res1, 1);
        ok(duration >= 49); // setTimeout is inaccurate, it could tick faster then expected.

        startTime = Date.now();
        const job = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 100);
        });
        const res2 = await Promise.after(job, 50);
        const duration2 = Date.now() - startTime;

        strictEqual(res2, 1);
        ok(duration2 >= 99);
    });

    it("sleep", async () => {
        const startTime = Date.now();
        await Promise.sleep(50);
        ok(Date.now() - startTime >= 49);
    });

    describe("until", () => {
        it("return true", async () => {
            let result = 0;
            const ok = await Promise.until(() => (++result) === 10);
            strictEqual(ok, true);
            strictEqual(result, 10);
        });

        it("return truthy", async () => {
            let value: string | undefined = undefined;
            const timer = setTimeout(() => {
                value = "ok";
            }, 50);

            const result = await Promise.until(() => value);
            clearTimeout(timer);
            strictEqual(result, "ok");
        });

        it("handle exception", async () => {
            let value: string | undefined = undefined;
            const timer = setTimeout(() => {
                value = "ok";
            }, 50);

            const result = await Promise.until(() => {
                if (value !== "ok") {
                    throw new Error("error");
                }
                return value;
            });
            clearTimeout(timer);
            strictEqual(result, "ok");
        });
    });

    it("select", async function () {
        if (isNodeBelow16) {
            this.skip();
        }

        const aborted: number[] = [];
        const result = await Promise.select([
            async signal => {
                let resolved = false;
                signal.addEventListener("abort", () => {
                    resolved || aborted.push(1);
                });

                await Promise.sleep(50);

                if (signal.aborted) {
                    return 0;
                }

                resolved = true;
                return 1;
            },
            async signal => {
                let resolved = false;
                signal.addEventListener("abort", () => {
                    resolved || aborted.push(2);
                });

                await Promise.sleep(100);

                if (signal.aborted) {
                    return 0;
                }

                resolved = true;
                return 2;
            },
        ]);

        strictEqual(result, 1);
        deepStrictEqual(aborted, [2]);
    });
});
