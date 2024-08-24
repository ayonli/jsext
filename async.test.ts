import "./augment.ts";
import jsext from "./index.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { asyncTask, abortable, sleep, abortWith } from "./async.ts";
import { isNodeBelow16 } from "./env.ts";
import { as } from "./object.ts";
import _try from "./try.ts";

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

    describe("select", () => {
        if (isNodeBelow16) {
            return;
        }

        it("functions", async () => {
            let aborted: number[] = [];
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

            aborted = [];
            const [err1, result1] = await _try(Promise.select([
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
                    throw new Error("error");
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
            ]));

            strictEqual((err1 as Error)?.name, "Error");
            strictEqual(result1, undefined);
            deepStrictEqual(aborted, [2]);
        });

        it("with promises", async () => {
            let aborted: number[] = [];
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
                new Promise<number>(resolve => {
                    setTimeout(() => {
                        resolve(3);
                    });
                }),
            ]);

            strictEqual(result, 3);
            deepStrictEqual(aborted, [1, 2]);

            aborted = [];
            const [err1, result1] = await _try(Promise.select([
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
                new Promise<number>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error("error"));
                    });
                }),
            ]));

            strictEqual((err1 as Error)?.name, "Error");
            strictEqual(result1, undefined);
            deepStrictEqual(aborted, [1, 2]);
        });

        it("with parent signal", async () => {
            let aborted: number[] = [];

            const ctrl = new AbortController();
            setTimeout(() => ctrl.abort(), 150);
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
            ], ctrl.signal);

            strictEqual(result, 1);
            deepStrictEqual(aborted, [2]);

            aborted = [];
            const ctrl1 = new AbortController();
            setTimeout(() => ctrl1.abort(), 10);
            const [err1, result1] = await _try(Promise.select([
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
            ], ctrl1.signal));

            strictEqual((err1 as Error)?.name, "AbortError");
            strictEqual(result1, undefined);
            deepStrictEqual(aborted, [1, 2]);

            aborted = [];
            const ctrl2 = new AbortController();
            ctrl2.abort();
            const [err2, result2] = await _try(Promise.select([
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
            ], ctrl2.signal));

            strictEqual((err2 as Error)?.name, "AbortError");
            strictEqual(result2, undefined);
            deepStrictEqual(aborted, []);
        });
    });

    describe("abortWith", () => {
        if (typeof AbortController === "undefined") {
            return;
        }

        it("aborted by itself", () => {
            const parent = new AbortController();
            const child = abortWith(parent.signal);

            child.abort();

            ok(!parent.signal.aborted);
            ok(child.signal.aborted);
        });

        it("aborted by parent", () => {
            const parent = new AbortController();
            const child = abortWith(parent.signal);

            parent.abort();

            ok(parent.signal.aborted);
            ok(child.signal.aborted);
            strictEqual(child.signal.reason, parent.signal.reason);
        });

        it("aborted by an already aborted parent", () => {
            const parent = new AbortController();
            parent.abort();
            const child = abortWith(parent.signal);

            ok(parent.signal.aborted);
            ok(child.signal.aborted);
            strictEqual(child.signal.reason, parent.signal.reason);
        });

        it("aborted by timeout", async () => {
            const parent = new AbortController();
            const child = abortWith(parent.signal, {
                timeout: 50,
            });

            await Promise.sleep(100);

            ok(!parent.signal.aborted);
            ok(child.signal.aborted);
            strictEqual((child.signal.reason as Error)?.name, "TimeoutError");
        });

        it("secondary signature", async () => {
            const parent0 = new AbortController();
            const child0 = abortWith({
                parent: parent0.signal,
                timeout: 50,
            });

            child0.abort();
            ok(!parent0.signal.aborted);
            ok(child0.signal.aborted);

            const parent1 = new AbortController();
            const child1 = abortWith({
                parent: parent1.signal,
                timeout: 50,
            });

            parent1.abort();
            ok(parent1.signal.aborted);
            ok(child1.signal.aborted);
            strictEqual(child1.signal.reason, parent1.signal.reason);

            const parent2 = new AbortController();
            parent2.abort();
            const child2 = abortWith({
                parent: parent2.signal,
                timeout: 50,
            });

            ok(parent2.signal.aborted);
            ok(child2.signal.aborted);
            strictEqual(child2.signal.reason, parent2.signal.reason);

            const parent3 = new AbortController();
            const child3 = abortWith({
                parent: parent3.signal,
                timeout: 50,
            });

            await Promise.sleep(100);
            ok(!parent3.signal.aborted);
            ok(child3.signal.aborted);
            strictEqual((child3.signal.reason as Error)?.name, "TimeoutError");

            const [err, child4] = _try(() => abortWith({}));
            strictEqual((err as Error)?.name, "TypeError");
            strictEqual(child4, undefined);
        });
    });
});
