/// <reference types="./lib.deno.d.ts" />
import "./augment/string.ts";
import "./augment/number.ts";
import "./augment/array.ts";
import "./augment/uint8array.ts";
import "./augment/object.ts";
import "./augment/math.ts";
import "./augment/promise.ts";
import "./augment/collections.ts";
import "./augment/error.ts";
import "./augment/json.ts";
import { AsyncFunction, AsyncGeneratorFunction } from "./index.ts";

declare global {
    const AsyncFunction: AsyncFunctionConstructor;
    const AsyncGeneratorFunction: AsyncGeneratorFunctionConstructor;

    interface AsyncFunction {
        (...args: any[]): Promise<unknown>;
        readonly length: number;
        readonly name: string;
    }

    interface AsyncFunctionConstructor {
        new(...args: any[]): AsyncFunction;
        (...args: any[]): AsyncFunction;
        readonly length: number;
        readonly name: string;
        readonly prototype: AsyncFunction;
    }

    interface Constructor<T> extends Function {
        new(...args: any[]): T;
        prototype: T;
    }

    interface RealArrayLike<T> extends ArrayLike<T> {
        slice(start?: number, end?: number): RealArrayLike<T>;
    }

    interface TypedArray extends Array<number> {
        readonly buffer: ArrayBufferLike;
        readonly byteLength: number;
        subarray(begin?: number, end?: number): TypedArray;
    }

    type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
    type Ensured<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
}

// @ts-ignore
globalThis["AsyncFunction"] = AsyncFunction;
// @ts-ignore
globalThis["AsyncGeneratorFunction"] = AsyncGeneratorFunction;
