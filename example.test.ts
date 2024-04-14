import { strictEqual } from "node:assert";
import jsext from "./index.ts";
import { isNode } from "./env.ts";

const isTsx = globalThis["process"]?.env["npm_lifecycle_script"]?.match(/\btsx\b/) ? true : false;

describe("jsext.example", () => {
    if (!isNode || isTsx) {
        return;
    }

    it("should output as expected", jsext.example(console => {
        console.log("Hello, World!");
        // output:
        // Hello, World!
    }));

    it("regular function", async function (this) {
        const [err1] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 1
        }, { suppress: true })());
        strictEqual(err1, null);

        const [err2] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 1

        }, { suppress: true })());
        strictEqual(err2, null);

        const [err3] = await jsext.try(jsext.example(console => {
            console.log(1);

            // Output:
            // 1

        }, { suppress: true })());
        strictEqual(err3, null);

        const [err4] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 2
        }, { suppress: true })());
        strictEqual((err4 as Error)?.message, "\nexpected:\n2\n\ngot:\n1");

        const [err5] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 2
            console.log(2);
        }, { suppress: true })());
        strictEqual(
            (err5 as Error)?.message,
            "the output comment must be at the end of the example");

        const [err6] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 1
            console.log(2);
            // output:
            // 2
        }, { suppress: true })());
        strictEqual(
            (err6 as Error)?.message,
            "there can only be one output comment in the example");

        const [err7] = await jsext.try(jsext.example(console => {
            console.log(typeof this.timeout);
            // output:
            //function
        }, { suppress: true })());
        strictEqual(
            (err7 as Error)?.message,
            "the output comment must start with '// '");

        const [err8] = await jsext.try(jsext.example(function (this: Mocha.Context, console) {
            console.log(typeof this.timeout);
            // output:
            // function
        }, { suppress: true }).apply(this));
        strictEqual(err8, null);
    });

    it("async function", async function () {
        const [err1] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 1
        }, { suppress: true })());
        strictEqual(err1, null);

        const [err2] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 1

        }, { suppress: true })());
        strictEqual(err2, null);

        const [err3] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);

            // Output:
            // 1

        }, { suppress: true })());
        strictEqual(err3, null);

        const [err4] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 2
        }, { suppress: true })());
        strictEqual((err4 as Error)?.message, "\nexpected:\n2\n\ngot:\n1");

        const [err5] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 2
            console.log(2);
        }, { suppress: true })());
        strictEqual(
            (err5 as Error)?.message,
            "the output comment must be at the end of the example");

        const [err6] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 1
            console.log(2);
            // output:
            // 2
        }, { suppress: true })());
        strictEqual(
            (err6 as Error)?.message,
            "there can only be one output comment in the example");

        const [err7] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(typeof this.timeout);
            // output:
            //function
        }, { suppress: true })());
        strictEqual(
            (err7 as Error)?.message,
            "the output comment must start with '// '");

        const [err8] = await jsext.try(jsext.example(async function (this: Mocha.Context, console) {
            await Promise.resolve(null);
            console.log(typeof this.timeout);
            // output:
            // function
        }, { suppress: true }).apply(this));
        strictEqual(err8, null);
    });
});
