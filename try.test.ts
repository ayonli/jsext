import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";

describe("jsext.try", () => {
    const EmptyStringError = new Error("the string must not be empty");

    it("regular function", () => {
        function check(str: string) {
            if (str.length === 0) {
                throw EmptyStringError;
            }
            return str;
        }

        deepStrictEqual(jsext.try(check, "Hello, World!"), [null, "Hello, World!"]);
        deepStrictEqual(jsext.try(check, ""), [EmptyStringError, undefined]);
    });

    it("async function", async () => {
        async function check(str: string) {
            if (str.length === 0) {
                throw EmptyStringError;
            }
            return await Promise.resolve(str);
        }

        deepStrictEqual(await jsext.try(check, "Hello, World!"), [null, "Hello, World!"]);
        deepStrictEqual(await jsext.try(check, ""), [EmptyStringError, undefined]);
    });

    it("generator function", () => {
        function* check(str: string) {
            if (str.length === 0) {
                throw EmptyStringError;
            }

            for (const x of str) {
                yield x;
            }

            return "OK";
        }

        const res = jsext.try(check, "Hello, World!");
        const errors: unknown[] = [];
        let str = "";

        while (true) {
            const { value: [err, x], done } = res.next();

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
        const errors2: unknown[] = [];
        let str2 = "";

        while (true) {
            const { value: [err, x], done } = res2.next();

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

    it("async generator function", async () => {
        // @ts-ignore
        async function* check(str: string) {
            if (str.length === 0) {
                throw EmptyStringError;
            }

            for (const x of str) {
                yield x;
            }

            return "OK";
        }

        const res = jsext.try(check, "Hello, World!");
        const errors: unknown[] = [];
        let str = "";

        while (true) {
            const { value: [err, x], done } = await res.next();

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
        const errors2: unknown[] = [];
        let str2 = "";

        while (true) {
            const { value: [err, x], done } = await res2.next();

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

    it("promise", async () => {
        async function check(str: string) {
            if (str.length === 0) {
                throw EmptyStringError;
            }
            return await Promise.resolve(str);
        }

        deepStrictEqual(await jsext.try(check("Hello, World!")), [null, "Hello, World!"]);
        deepStrictEqual(await jsext.try(check("")), [EmptyStringError, undefined]);
    });

    it("convert non-Error", async () => {
        function check(str: string) {
            if (str.length === 0) {
                throw "the string must not be empty";
            }
            return str;
        }

        const [err1] = jsext.try(check, "");
        ok(err1 instanceof Error);
        strictEqual(err1.message, "the string must not be empty");

        async function checkAsync(str: string) {
            if (str.length === 0) {
                throw "the string must not be empty";
            }
            return str;
        }

        const [err2] = await jsext.try(checkAsync, "");
        ok(err2 instanceof Error);
        strictEqual(err2.message, "the string must not be empty");

        const [err3] = await jsext.try(checkAsync(""));
        ok(err3 instanceof Error);
        strictEqual(err3.message, "the string must not be empty");

        function* checkGen(str: string) {
            if (str.length === 0) {
                throw "the string must not be empty";
            }

            for (const x of str) {
                yield x;
            }

            return "OK";
        }

        const gen1 = jsext.try(checkGen, "");
        const { value: [err4] } = gen1.next();
        ok(err4 instanceof Error);
        strictEqual(err4.message, "the string must not be empty");

        async function* checkGenAsync(str: string) {
            if (str.length === 0) {
                throw "the string must not be empty";
            }

            for (const x of str) {
                yield x;
            }

            return "OK";
        }

        const gen2 = jsext.try(checkGenAsync, "");
        const { value: [err5] } = await gen2.next();
        ok(err5 instanceof Error);
        strictEqual(err5.message, "the string must not be empty");
    });

    it("pass value into generator function", () => {
        const res = jsext.try(function* (str): Generator<string, string, number> {
            if (str.length === 0) {
                throw EmptyStringError;
            }

            let count = 0;

            for (const x of str) {
                count += yield x;
            }

            return String(count);
        }, "Hello, World!");
        const errors: unknown[] = [];
        let str = "";

        while (true) {
            const { value: [err, x], done } = res.next(1);

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

    it("pass value into async generator function", async () => {
        const res = jsext.try(async function* (str): AsyncGenerator<string, string, number> {
            if (str.length === 0) {
                throw EmptyStringError;
            }

            let count = 0;

            for (const x of str) {
                count += yield x;
            }

            return String(count);
        }, "Hello, World!");
        const errors: unknown[] = [];
        let str = "";

        while (true) {
            const { value: [err, x], done } = await res.next(1);

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
