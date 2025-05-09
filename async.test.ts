import "./augment.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { asyncTask, abortable, sleep, abortWith, pace, timeout, until, select } from "./async.ts";
import { isNodeBelow16 } from "./env.ts";
import { as } from "./object.ts";
import { try_ } from "./result.ts";

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
            const { value, error } = await try_(task);
            strictEqual(value, undefined);
            deepStrictEqual(error, new Error("error"));
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

                const { value, error } = await try_(abortable(job, controller.signal));

                timer && clearTimeout(timer);
                strictEqual(value, undefined);
                deepStrictEqual(error, controller.signal.reason);
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

                const { value, error } = await try_(abortable(job, controller.signal));

                timer && clearTimeout(timer);
                strictEqual(value, undefined);
                deepStrictEqual(error, controller.signal.reason);
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

                const { value, error } = await try_(abortable(job, controller.signal));

                clearTimeout(timer);
                strictEqual(value, 1);
                strictEqual(error, undefined);
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
                const { error } = await try_(async () => {
                    for await (const value of abortable(job(), controller.signal)) {
                        result.push(value);
                    }
                });

                deepStrictEqual(result, []);
                deepStrictEqual(error, controller.signal.reason);
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
                const { error } = await try_(async () => {
                    for await (const value of abortable(job(), controller.signal)) {
                        result.push(value);
                    }
                });

                deepStrictEqual(result, [1, 2]);
                deepStrictEqual(error, controller.signal.reason);
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
                const { ok } = await try_(async () => {
                    for await (const value of abortable(job(), controller.signal)) {
                        result.push(value);
                    }
                });

                clearTimeout(timer);
                deepStrictEqual(result, [1, 2, 3]);
                strictEqual(ok, true);
            });
        });
    });

    it("timeout", async () => {
        const res1 = await timeout(Promise.resolve(1), 50);

        strictEqual(res1, 1);

        const job = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 100);
        });
        const { value, error } = await try_(timeout(job, 50));
        strictEqual(value, undefined);
        deepStrictEqual(as(error, Error)?.message, "Operation timeout after 50ms");

        strictEqual(Promise.timeout, timeout);
    });

    it("pace", async () => {
        let startTime = Date.now();
        const res1 = await pace(Promise.resolve(1), 50);
        const duration = Date.now() - startTime;

        strictEqual(res1, 1);
        ok(duration >= 49); // setTimeout is inaccurate, it could tick faster then expected.

        startTime = Date.now();
        const job = new Promise<number>((resolve) => {
            setTimeout(() => {
                resolve(1);
            }, 100);
        });
        const res2 = await pace(job, 50);
        const duration2 = Date.now() - startTime;

        strictEqual(res2, 1);
        ok(duration2 >= 99);

        strictEqual(Promise.pace, pace);
        strictEqual(Promise.after, pace);
    });

    it("sleep", async () => {
        const startTime = Date.now();
        await sleep(50);
        ok(Date.now() - startTime >= 49);

        strictEqual(Promise.sleep, sleep);
    });

    describe("until", () => {
        it("return true", async () => {
            let result = 0;
            const ok = await until(() => (++result) === 10);
            strictEqual(ok, true);
            strictEqual(result, 10);
        });

        it("return truthy", async () => {
            let value: string | undefined = undefined;
            const timer = setTimeout(() => {
                value = "ok";
            }, 50);

            const result = await until(() => value);
            clearTimeout(timer);
            strictEqual(result, "ok");
        });

        it("handle exception", async () => {
            let value: string | undefined = undefined;
            const timer = setTimeout(() => {
                value = "ok";
            }, 50);

            const result = await until(() => {
                if (value !== "ok") {
                    throw new Error("error");
                }
                return value;
            });
            clearTimeout(timer);
            strictEqual(result, "ok");
        });

        it("augment", () => {
            strictEqual(Promise.until, until);
        });
    });

    describe("select", () => {
        if (isNodeBelow16) {
            return;
        }

        it("functions", async () => {
            let aborted: number[] = [];
            const signals = new Map<number, AbortSignal>();
            const result = await select([
                async signal => {
                    let resolved = false;
                    signals.set(1, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(1);
                    });

                    await sleep(50);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 1;
                },
                async signal => {
                    let resolved = false;
                    signals.set(2, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(2);
                    });

                    await sleep(100);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 2;
                },
            ]);

            strictEqual(result, 1);
            deepStrictEqual(aborted, [2]);
            strictEqual(signals.get(1)!.aborted, false);
            strictEqual(signals.get(2)!.aborted, true);

            aborted = [];
            signals.clear();

            const {
                ok: ok1,
                value: result1,
                error: err1,
            } = await try_(select([
                async signal => {
                    let resolved = false;
                    signals.set(1, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(1);
                    });

                    await sleep(50);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    throw new Error("error");
                },
                async signal => {
                    let resolved = false;
                    signals.set(2, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(2);
                    });

                    await sleep(100);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 2;
                },
            ]));

            strictEqual(ok1, false);
            strictEqual((err1 as Error)?.name, "Error");
            strictEqual(result1, undefined);
            deepStrictEqual(aborted, [2]);
            strictEqual(signals.get(1)!.aborted, false);
            strictEqual(signals.get(2)!.aborted, true);
        });

        it("with promises", async () => {
            let aborted: number[] = [];
            const signals = new Map<number, AbortSignal>();
            const result = await select([
                async signal => {
                    let resolved = false;
                    signals.set(1, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(1);
                    });

                    await sleep(50);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 1;
                },
                async signal => {
                    let resolved = false;
                    signals.set(2, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(2);
                    });

                    await sleep(100);

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
            strictEqual(signals.get(1)!.aborted, true);
            strictEqual(signals.get(2)!.aborted, true);

            aborted = [];
            signals.clear();

            const {
                ok: ok1,
                value: result1,
                error: err1,
            } = await try_(select([
                async signal => {
                    let resolved = false;
                    signals.set(1, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(1);
                    });

                    await sleep(50);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 1;
                },
                async signal => {
                    let resolved = false;
                    signals.set(2, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(2);
                    });

                    await sleep(100);

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

            strictEqual(ok1, false);
            strictEqual((err1 as Error)?.name, "Error");
            strictEqual(result1, undefined);
            deepStrictEqual(aborted, [1, 2]);
            strictEqual(signals.get(1)!.aborted, true);
            strictEqual(signals.get(2)!.aborted, true);
        });

        it("with parent signal", async () => {
            let aborted: number[] = [];
            const signals = new Map<number, AbortSignal>();

            const ctrl = new AbortController();
            setTimeout(() => ctrl.abort(), 150);
            const result = await select([
                async signal => {
                    let resolved = false;
                    signals.set(1, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(1);
                    });

                    await sleep(50);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 1;
                },
                async signal => {
                    let resolved = false;
                    signals.set(2, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(2);
                    });

                    await sleep(100);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 2;
                },
            ], ctrl.signal);

            strictEqual(result, 1);
            deepStrictEqual(aborted, [2]);
            strictEqual(signals.get(1)!.aborted, false);
            strictEqual(signals.get(2)!.aborted, true);

            await sleep(100);
            strictEqual(ctrl.signal.aborted, true);
            strictEqual(signals.get(1)!.aborted, false);

            aborted = [];
            signals.clear();

            const ctrl1 = new AbortController();
            setTimeout(() => ctrl1.abort(), 10);
            const {
                ok: ok1,
                value: result1,
                error: err1,
            } = await try_(select([
                async signal => {
                    let resolved = false;
                    signals.set(1, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(1);
                    });

                    await sleep(50);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 1;
                },
                async signal => {
                    let resolved = false;
                    signals.set(2, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(2);
                    });

                    await sleep(100);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 2;
                },
            ], ctrl1.signal));

            strictEqual(ok1, false);
            strictEqual((err1 as Error)?.name, "AbortError");
            strictEqual(result1, undefined);
            deepStrictEqual(aborted, [1, 2]);
            strictEqual(signals.get(1)!.aborted, true);
            strictEqual(signals.get(2)!.aborted, true);

            aborted = [];
            signals.clear();

            const ctrl2 = new AbortController();
            ctrl2.abort();
            const {
                ok: ok2,
                value: result2,
                error: err2,
            } = await try_(select([
                async signal => {
                    let resolved = false;
                    signals.set(1, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(1);
                    });

                    await sleep(50);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 1;
                },
                async signal => {
                    let resolved = false;
                    signals.set(2, signal);
                    signal.addEventListener("abort", () => {
                        resolved || aborted.push(2);
                    });

                    await sleep(100);

                    if (signal.aborted) {
                        return 0;
                    }

                    resolved = true;
                    return 2;
                },
            ], ctrl2.signal));

            strictEqual(ok2, false);
            strictEqual((err2 as Error)?.name, "AbortError");
            strictEqual(result2, undefined);
            deepStrictEqual(aborted, []);
            strictEqual(signals.size, 0);
        });

        it("augment", () => {
            strictEqual(Promise.select, select);
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

            await sleep(100);

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

            await sleep(100);
            ok(!parent3.signal.aborted);
            ok(child3.signal.aborted);
            strictEqual((child3.signal.reason as Error)?.name, "TimeoutError");

            const {
                ok: ok4,
                value: child4,
                error: err,
            } = try_(() => abortWith({}));
            strictEqual(ok4, false);
            strictEqual((err as Error)?.name, "TypeError");
            strictEqual(child4, undefined);
        });
    });
});
