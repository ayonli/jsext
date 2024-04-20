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
import { AsyncFunction, AsyncGeneratorFunction } from "./types.ts";

declare global {
    /** This is the very constructor/class of all async functions. */
    const AsyncFunction: AsyncFunctionConstructor;
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

    /** This is the very constructor/class of all async generator functions. */
    const AsyncGeneratorFunction: AsyncGeneratorFunctionConstructor;

    /** This interface represents the constructor/class of the given `T` type. */
    interface Constructor<T = object> extends Function {
        new(...args: any[]): T;
        prototype: T;
    }

    /** A real-array-like object is an array-like object with a `slice` method. */
    interface RealArrayLike<T> extends ArrayLike<T> {
        slice(start?: number, end?: number): RealArrayLike<T>;
    }

    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
     */
    interface TypedArray extends Array<number> {
        readonly buffer: ArrayBufferLike;
        readonly byteLength: number;
        subarray(begin?: number, end?: number): TypedArray;
    }

    /**
     * Constructs a type by making the specified keys optional.
     * 
     * @example
     * ```ts
     * interface User {
     *     name: string;
     *     age: number;
     * }
     * 
     * type UserPartial = Optional<User, "age">; // { name: string; age?: number; }
     * ```
     */
    type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

    /**
     * Constructs a type by ensuring the specified keys are required.
     * 
     * @example
     * ```ts
     * interface User {
     *     name: string;
     *     age?: number;
     * }
     * 
     * type UserRequired = Ensured<User, "age">; // { name: string; age: number; }
     * ```
     */
    type Ensured<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
}

// @ts-ignore
globalThis["AsyncFunction"] = AsyncFunction;
// @ts-ignore
globalThis["AsyncGeneratorFunction"] = AsyncGeneratorFunction;
