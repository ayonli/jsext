import assert from "node:assert";
import jsext from "./index.ts";

declare var Bun: any;

describe("jsext.example", () => {
    it("regular function", async function (this) {
        if (typeof Bun === "object") {
            this.skip();
        }

        const [err1] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 1
        })());
        assert.strictEqual(err1, null);

        const [err2] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 1

        })());
        assert.strictEqual(err2, null);

        const [err3] = await jsext.try(jsext.example(console => {
            console.log(1);

            // Output:
            // 1

        })());
        assert.strictEqual(err3, null);

        const [err4] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 2
        })());
        assert.strictEqual(err4?.message, "\nexpected:\n2\n\ngot:\n1");

        const [err5] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 2
            console.log(2);
        })());
        assert.strictEqual(
            err5?.message,
            "the output comment must be at the end of the example");

        const [err6] = await jsext.try(jsext.example(console => {
            console.log(1);
            // output:
            // 1
            console.log(2);
            // output:
            // 2
        })());
        assert.strictEqual(
            err6?.message,
            "there can only be one output comment in the example");

        const [err7] = await jsext.try(jsext.example(function (this: Mocha.Context, console) {
            console.log(typeof this.timeout);
            // output:
            // function
        }).apply(this));
        assert.strictEqual(err7, null);
    });

    it("async function", async function () {
        if (typeof Bun === "object") {
            this.skip();
        }

        const [err1] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 1
        })());
        assert.strictEqual(err1, null);

        const [err2] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 1

        })());
        assert.strictEqual(err2, null);

        const [err3] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);

            // Output:
            // 1

        })());
        assert.strictEqual(err3, null);

        const [err4] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 2
        })());
        assert.strictEqual(err4?.message, "\nexpected:\n2\n\ngot:\n1");

        const [err5] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 2
            console.log(2);
        })());
        assert.strictEqual(
            err5?.message,
            "the output comment must be at the end of the example");

        const [err6] = await jsext.try(jsext.example(async console => {
            await Promise.resolve(null);
            console.log(1);
            // output:
            // 1
            console.log(2);
            // output:
            // 2
        })());
        assert.strictEqual(
            err6?.message,
            "there can only be one output comment in the example");

        const [err7] = await jsext.try(jsext.example(async function (this: Mocha.Context, console) {
            await Promise.resolve(null);
            console.log(typeof this.timeout);
            // output:
            // function
        }).apply(this));
        assert.strictEqual(err7, null);
    });
});