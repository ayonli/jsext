import { ok } from "node:assert";
import { AsyncFunction, AsyncGeneratorFunction, TypedArray } from "./types.ts";

describe("types", () => {
    const fn1: AsyncFunction = async function () { };
    const fn2: AsyncFunction = async () => { };
    const fn3 = async function* () { } as AsyncGeneratorFunction;
    const fn4 = function* () { };
    const fn5 = function () { };
    const fn6 = () => { };
    const class1 = class { };

    it("AsyncFunction", () => {
        ok(fn1 instanceof AsyncFunction);
        ok(fn2 instanceof AsyncFunction);

        ok(!(fn3 instanceof AsyncFunction));
        ok(!(fn4 instanceof AsyncFunction));
        ok(!(fn5 instanceof AsyncFunction));
        ok(!(fn6 instanceof AsyncFunction));
        ok(!(class1 instanceof AsyncFunction));
    });

    it("AsyncGeneratorFunction", () => {
        ok(fn3 instanceof AsyncGeneratorFunction);

        ok(!(fn1 instanceof AsyncGeneratorFunction));
        ok(!(fn2 instanceof AsyncGeneratorFunction));
        ok(!(fn4 instanceof AsyncGeneratorFunction));
        ok(!(fn5 instanceof AsyncGeneratorFunction));
        ok(!(fn6 instanceof AsyncGeneratorFunction));
        ok(!(class1 instanceof AsyncGeneratorFunction));
    });

    it("TypedArray", () => {
        const array1 = new Uint8Array(8);
        const array2 = new Int8Array(8);
        const array3 = new Uint16Array(8);
        const array4 = new Int16Array(8);
        const array5 = new Uint32Array(8);
        const array6 = new Int32Array(8);
        const array7 = new Float32Array(8);
        const array8 = new Float64Array(8);
        const buffer = new ArrayBuffer(8);

        ok(array1 instanceof TypedArray);
        ok(array2 instanceof TypedArray);
        ok(array3 instanceof TypedArray);
        ok(array4 instanceof TypedArray);
        ok(array5 instanceof TypedArray);
        ok(array6 instanceof TypedArray);
        ok(array7 instanceof TypedArray);
        ok(array8 instanceof TypedArray);

        ok(!(Uint8Array instanceof TypedArray));
        ok(!(buffer instanceof TypedArray));
    });
});
