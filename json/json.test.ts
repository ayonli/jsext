import "../augment.ts";
import { deepStrictEqual, strictEqual } from "node:assert";

describe("JSON", () => {
    describe("JSON.parseAs", () => {
        it("null", () => {
            strictEqual(JSON.parseAs("null", Object), null);
            strictEqual(JSON.parseAs("null", Array), null);
        });

        it("boolean", () => {
            strictEqual(JSON.parseAs("true", Boolean), true);
            strictEqual(JSON.parseAs("false", Boolean), false);
            strictEqual(JSON.parseAs("true", Number), null);
        });

        it("number", () => {
            strictEqual(JSON.parseAs("123", Number), 123);
            strictEqual(JSON.parseAs("123", BigInt), BigInt(123));
            strictEqual(JSON.parseAs("123", String), null);
        });

        it("string", () => {
            strictEqual(JSON.parseAs(`"Hello, World!"`, String), "Hello, World!");

            const date = new Date();
            deepStrictEqual(JSON.parseAs(`"${date.toISOString()}"`, Date), date);

            strictEqual(JSON.parseAs(`"123"`, Number), null);
        });

        it("array", () => {
            class MyArray extends Array { }

            deepStrictEqual(JSON.parseAs(`[1,2,3]`, Array), [1, 2, 3]);
            // @ts-ignore
            deepStrictEqual(JSON.parseAs(`[1,2,3]`, MyArray), new MyArray<number>(1, 2, 3));

            if (typeof Buffer === "function") {
                deepStrictEqual(JSON.parseAs(`[1,2,3]`, Buffer), Buffer.from([1, 2, 3]));
            }

            strictEqual(JSON.parseAs(`[1,2,3]`, Object), null);
        });

        it("object", () => {
            class Example {
                constructor(public foo: string, public bar: Date) { }

                static fromJSON(data: any) {
                    if (typeof data === "object" && !Array.isArray(data)) {
                        return new this(data.foo, new Date(data.bar));
                    } else {
                        return null;
                    }
                }
            }

            class Example2 {
                constructor(public foo: string) { }
            }

            deepStrictEqual(JSON.parseAs(`{"foo":"Hello","bar":"World"}`, Object), {
                foo: "Hello",
                bar: "World",
            });

            const date = new Date();
            deepStrictEqual(
                JSON.parseAs(`{"foo":"Hello","bar":"${date.toISOString()}"}`, Example),
                new Example("Hello", date)
            );

            deepStrictEqual(JSON.parseAs(`{"foo":"Hello"}`, Example2), new Example2("Hello"));

            deepStrictEqual(JSON.parseAs(`{"foo":"Hello"}`, String), null);

            const tArr = Uint8Array.from([1, 2, 3]);
            deepStrictEqual(JSON.parseAs(JSON.stringify(tArr), Uint8Array), tArr);

            if (typeof Buffer === "function") {
                const buf = Buffer.from([1, 2, 3]);
                deepStrictEqual(JSON.parseAs(JSON.stringify(buf), Buffer), buf);
                deepStrictEqual(JSON.parseAs(JSON.stringify(buf), Uint8Array), tArr);
            }

            const err = new Error("something went wrong");
            const err2 = JSON.parseAs(JSON.stringify(err), Error);
            strictEqual(err2?.name, err.name);
            strictEqual(err2?.message, err.message);
            strictEqual(err2?.stack, err.stack);

            const err3 = new Exception("something is not right");
            const err4 = JSON.parseAs(JSON.stringify(err3), Exception);
            strictEqual(err4?.name, err3.name);
            strictEqual(err4?.message, err3.message);
            strictEqual(err4?.stack, err3.stack);
            strictEqual(err4?.cause, err3.cause);
            strictEqual(err4.code, err3.code);
        });
    });

    describe("JSON.as", () => {
        it("null", () => {
            strictEqual(JSON.as(null, Object), null);
            strictEqual(JSON.as(null, Array), null);
        });

        it("boolean", () => {
            strictEqual(JSON.as(true, Boolean), true);
            strictEqual(JSON.as(false, Boolean), false);
            strictEqual(JSON.as(true, Number), null);
        });

        it("number", () => {
            strictEqual(JSON.as(123, Number), 123);
            strictEqual(JSON.as(123, BigInt), BigInt(123));
            strictEqual(JSON.as(123, String), null);
        });

        it("string", () => {
            strictEqual(JSON.as("Hello, World!", String), "Hello, World!");

            const date = new Date();
            deepStrictEqual(JSON.as(date.toISOString(), Date), date);

            strictEqual(JSON.as("123", Number), null);
        });

        it("array", () => {
            class MyArray extends Array { }

            deepStrictEqual(JSON.as([1, 2, 3], Array), [1, 2, 3]);
            // @ts-ignore
            deepStrictEqual(JSON.as([1, 2, 3], MyArray), new MyArray<number>(1, 2, 3));

            if (typeof Buffer === "function") {
                deepStrictEqual(JSON.as([1, 2, 3], Buffer), Buffer.from([1, 2, 3]));
            }

            strictEqual(JSON.as([1, 2, 3], Object), null);
        });

        it("object", () => {
            class Example {
                constructor(public foo: string, public bar: Date) { }

                static fromJSON(data: any) {
                    if (typeof data === "object" && !Array.isArray(data)) {
                        return new this(data.foo, new Date(data.bar));
                    } else {
                        return null;
                    }
                }
            }

            class Example2 {
                constructor(public foo: string) { }
            }

            deepStrictEqual(JSON.as({ "foo": "Hello", "bar": "World" }, Object), {
                foo: "Hello",
                bar: "World",
            });

            const date = new Date();
            deepStrictEqual(
                JSON.as({ "foo": "Hello", "bar": date.toISOString() }, Example),
                new Example("Hello", date)
            );

            deepStrictEqual(JSON.as({ "foo": "Hello" }, Example2), new Example2("Hello"));

            deepStrictEqual(JSON.as({ "foo": "Hello" }, String), null);

            const tArr = Uint8Array.from([1, 2, 3]);
            deepStrictEqual(JSON.as(JSON.parse(JSON.stringify(tArr)), Uint8Array), tArr);

            if (typeof Buffer === "function") {
                const buf = Buffer.from([1, 2, 3]);
                deepStrictEqual(JSON.as(JSON.parse(JSON.stringify(buf)), Buffer), buf);
                deepStrictEqual(JSON.as(JSON.parse(JSON.stringify(buf)), Uint8Array), tArr);
            }

            const err = new Error("something went wrong");
            const err2 = JSON.as(JSON.parse(JSON.stringify(err)), Error);
            strictEqual(err2?.name, err.name);
            strictEqual(err2?.message, err.message);
            strictEqual(err2?.stack, err.stack);

            const err3 = new Exception("something is not right");
            const err4 = JSON.as(JSON.parse(JSON.stringify(err3)), Exception);
            strictEqual(err4?.name, err3.name);
            strictEqual(err4?.message, err3.message);
            strictEqual(err4?.stack, err3.stack);
            strictEqual(err4?.cause, err3.cause);
            strictEqual(err4.code, err3.code);
        });
    });

    it("@JSON.type", () => {
        class Example {
            @JSON.type(Date)
            bar: Date | undefined;

            constructor(public foo: string, bar: Date) {
                this.bar = bar;
            }
        }

        const date = new Date();
        deepStrictEqual(
            JSON.parseAs(`{"foo":"Hello","bar":"${date.toISOString()}"}`, Example),
            new Example("Hello", date)
        );
    });
});
