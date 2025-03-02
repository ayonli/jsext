import { deepStrictEqual, ok, strictEqual } from "node:assert";
import jsext from "./index.ts";
import _try from "./try.ts";
import { range } from "./number.ts";
import { sum } from "./math.ts";
import { pick } from "./object.ts";
import Exception from "./error/Exception.ts";
import * as path from "node:path";
import { trim } from "./string.ts";
import { readAsArray } from "./reader.ts";
import { isDeno } from "./env.ts";

declare var AggregateError: new (errors: Error[], message?: string, options?: { cause: unknown; }) => Error & { errors: Error[]; };

const isTsx = globalThis["process"]?.env["npm_lifecycle_script"]?.match(/\btsx\b/) ? true : false;

describe("jsext.parallel", () => {
    const modUrl = new URL("./examples/worker.mjs", import.meta.url).href;
    // @ts-ignore because allowJs is not turned on
    const mod = jsext.parallel(() => import("./examples/worker.mjs"));

    it("return", async () => {
        // @ts-ignore because allowJs is not turned on
        strictEqual(await mod.greet("World"), "Hi, World");
    });

    it("yield", async () => {
        // @ts-ignore because allowJs is not turned on
        const iter = mod.sequence(["foo", "bar"]);
        const words: string[] = [];

        for await (const word of iter) {
            words.push(word);
        }

        deepStrictEqual(words, ["foo", "bar"]);
        strictEqual(await Promise.resolve(iter), "foo, bar");
    });

    it("use error", async () => {
        // @ts-ignore because allowJs is not turned on
        const [err1] = await _try(mod.throwError("not good"));
        ok(err1 instanceof Error);
        strictEqual(err1.message, "not good");

        const err2 = new Error("something went wrong");
        // @ts-ignore because allowJs is not turned on
        const returns2 = await mod.transferError(err2);
        ok(returns2 instanceof Error);
        strictEqual(returns2.message, err2.message);
        strictEqual(returns2.stack, err2.stack);

        const err3 = new EvalError("something went wrong");
        // @ts-ignore because allowJs is not turned on
        const returns3 = await mod.transferError(err3);
        ok(returns3 instanceof EvalError);
        strictEqual(returns3.message, err3.message);
        strictEqual(returns3.stack, err3.stack);

        const err4 = new RangeError("something went wrong");
        // @ts-ignore because allowJs is not turned on
        const returns4 = await mod.transferError(err4);
        ok(returns4 instanceof RangeError);
        strictEqual(returns4.message, err4.message);
        strictEqual(returns4.stack, err4.stack);

        const err5 = new ReferenceError("something went wrong");
        // @ts-ignore because allowJs is not turned on
        const returns5 = await mod.transferError(err5);
        ok(returns5 instanceof ReferenceError);
        strictEqual(returns5.message, err5.message);
        strictEqual(returns5.stack, err5.stack);

        const err6 = new SyntaxError("something went wrong");
        // @ts-ignore because allowJs is not turned on
        const returns6 = await mod.transferError(err6);
        ok(returns6 instanceof SyntaxError);
        strictEqual(returns6.message, err6.message);
        strictEqual(returns6.stack, err6.stack);

        const err7 = new TypeError("something went wrong");
        // @ts-ignore because allowJs is not turned on
        const returns7 = await mod.transferError(err7);
        ok(returns7 instanceof TypeError);
        strictEqual(returns7.message, err7.message);
        strictEqual(returns7.stack, err7.stack);

        const err8 = new URIError("something went wrong");
        // @ts-ignore because allowJs is not turned on
        const returns8 = await mod.transferError(err8);
        ok(returns8 instanceof URIError);
        strictEqual(returns8.message, err8.message);
        strictEqual(returns8.stack, err8.stack);

        const err9 = new Exception("something went wrong", "UnknownError");
        // @ts-ignore because allowJs is not turned on
        const returns9 = await mod.transferError(err9);
        ok(returns9 instanceof Exception);
        strictEqual(returns9.name, "UnknownError");
        strictEqual(returns9.message, err9.message);
        strictEqual(returns9.stack, err9.stack);

        if (typeof DOMException === "function") {
            const err10 = new DOMException("something went wrong", "UnknownError");
            // @ts-ignore because allowJs is not turned on
            const returns10 = await mod.transferError(err10);

            ok(returns10 instanceof DOMException);
            strictEqual(returns10.name, "UnknownError");
            strictEqual(returns10.message, err10.message);
            strictEqual(returns10.stack, err10.stack);
        }

        if (typeof AggregateError === "function") {
            const _err = new Error("another error");
            const err10 = new AggregateError([_err], "something went wrong");
            // @ts-ignore because allowJs is not turned on
            const returns10 = await mod.transferError(err10);

            ok(returns10 instanceof AggregateError);
            strictEqual(returns10.name, "AggregateError");
            strictEqual(returns10.message, err10.message);
            strictEqual(returns10.stack, err10.stack);
            deepStrictEqual(pick(returns10.errors[0], ["constructor", "name", "message", "stack"]),
                pick(err10.errors[0], ["constructor", "name", "message", "stack"]));
        }
    });

    it("use channel", async () => {
        const channel = jsext.chan<{ value: number; done: boolean; }>();
        // @ts-ignore because allowJs is not turned on
        const length = mod.twoTimesValues(channel);

        for (const value of range(0, 9)) {
            await channel.send({ value, done: value === 9 });
        }

        const results = (await readAsArray(channel)).map(item => item.value);
        deepStrictEqual(results, [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
        strictEqual(await length, 10);

        const channel2 = jsext.chan<number>();
        // @ts-ignore because allowJs is not turned on
        const values2 = mod.threeTimesValues(channel2);
        // @ts-ignore because allowJs is not turned on
        const _values2 = mod.threeTimesValues(channel2);

        for (const value of range(1, 10)) {
            await channel2.send(value);
        }

        const results2: number[] = [];

        for await (const value of channel2) {
            results2.push(value);

            if (results2.length === 10) {
                break;
            }
        }

        deepStrictEqual(await values2, [3, 9, 15, 21, 27]);
        deepStrictEqual(await _values2, [6, 12, 18, 24, 30]);
        strictEqual(sum(...results2), 165);
        channel2.close();

        // @ts-ignore because allowJs is not turned on
        const mod2 = jsext.parallel(() => import("./examples/worker.mjs"));

        const channel3 = jsext.chan<number>();
        // @ts-ignore because allowJs is not turned on
        const values3 = mod.threeTimesValues(channel3);
        // @ts-ignore because allowJs is not turned on
        const _values3 = mod2.threeTimesValues(channel3);

        for (const value of range(1, 10)) {
            await channel3.send(value);
        }

        const results3: number[] = [];

        for await (const value of channel3) {
            results3.push(value);

            if (results3.length === 10) {
                break;
            }
        }

        deepStrictEqual(await values3, [3, 9, 15, 21, 27]);
        deepStrictEqual(await _values3, [6, 12, 18, 24, 30]);
        strictEqual(sum(...results3), 165);
        channel3.close();
    });

    it("use transferable", async () => {
        const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        // @ts-ignore because allowJs is not turned on
        const length = await mod.transfer(arr.buffer);

        strictEqual(length, 10);
        strictEqual(arr.length, 0);

        const arr2 = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        // @ts-ignore because allowJs is not turned on
        const res = await mod.transferInObject({ data: arr2.buffer });
        strictEqual(arr2.length, 0);
        deepStrictEqual(res, {
            data: Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer,
        });
    });

    it("send unserializable", async () => {
        // @ts-ignore because allowJs is not turned on
        const [err] = await _try(async () => await mod.throwUnserializableError(() => null));

        if (typeof Bun === "object") {
            // Currently Bun/JSCore has problem capturing the call stack in async functions,
            // so the stack may not include the current filename, we just have to test
            // if the error is captured.
            ok(err instanceof Error);
        } else {
            const __filename = trim(
                import.meta.url.replace(/^(file|https?):\/\//, "").replace(/\//g, path.sep),
                path.sep).replace(/^([a-zA-Z]):/, "");
            const stack = (err as DOMException)?.stack?.replace(/\//g, path.sep);
            ok(stack?.includes(__filename));
        }
    });

    it("receive unserializable", async () => {
        // @ts-ignore because allowJs is not turned on
        const [err] = await _try(async () => await mod.throwUnserializableError(1));
        const __filename = trim(
            modUrl.replace(/^(file|https?):\/\//, "").replace(/\//g, path.sep),
            path.sep).replace(/^([a-zA-Z]):/, "");
        const stack = (err as DOMException)?.stack?.replace(/\//g, path.sep);
        ok(stack?.includes(__filename));
    });

    it("in dependencies", async () => {
        if (!isTsx) {
            // @ts-ignore because allowJs is not turned on
            const { default: avg } = await import("./examples/avg.js");
            strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
        }

        if (typeof Deno === "object" || typeof Bun === "object") {
            // @ts-ignore because allowJs is not turned on
            const { default: avg } = await import("./examples/avg2.ts");
            strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
        }
    });

    it("in worker", async () => {
        // @ts-ignore because allowJs is not turned on
        const { default: avg } = jsext.parallel(() => import("./examples/avg.js"));
        strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);

        if (typeof Deno === "object" || typeof Bun === "object") {
            // @ts-ignore because allowJs is not turned on
            const { default: avg } = jsext.parallel(() => import("./examples/avg2.ts"));
            strictEqual(await avg(1, 2, 3, 4, 5, 6, 7, 8, 9), 5);
        }
    });

    it("omit suffix", async function () {
        if (isDeno) {
            this.skip();
        }

        // @ts-ignore because allowJs is not turned on
        const { default: sum } = jsext.parallel(() => import("./examples/sum"));
        strictEqual(await sum(1, 2, 3, 4, 5, 6, 7, 8, 9), 45);

        if (typeof Bun === "object") {
            const { default: sum } = jsext.parallel(() => import("./examples/sum2"));
            strictEqual(await sum(1, 2, 3, 4, 5, 6, 7, 8, 9), 45);
        }
    });

    it("builtin module", async () => {
        const mod2 = jsext.parallel(() => import("node:path"));
        const dir = await mod2.dirname("/usr/bin/curl");
        strictEqual(dir, "/usr/bin");
    });

    it("3-party module", async function () {
        if (isDeno) {
            this.skip();
        }

        // @ts-ignore because allowJs is not turned on
        const mod2 = jsext.parallel(() => import("glob"));
        // @ts-ignore because allowJs is not turned on
        const files = await mod2.sync("*.ts");
        ok(files.length > 0);
    });

    it("CommonJS", async () => {
        // @ts-ignore because allowJs is not turned on
        const mod2 = jsext.parallel(() => import("./examples/worker.cjs"));
        // @ts-ignore because allowJs is not turned on
        strictEqual((await mod2.greet("World!")), "Hi, World!");

        if (!isDeno) {
            // @ts-ignore because allowJs is not turned on
            const mod2 = jsext.parallel(() => import("string-hash"));
            // @ts-ignore because allowJs is not turned on
            ok((await mod2.default("Hello, World!")) > 0);
        }
    });
});
