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
import "./augment/pipe.ts";
import { AsyncFunction, AsyncGeneratorFunction } from "./types.ts";
import { customInspect } from "./runtime.ts";

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

    interface SymbolConstructor {
        readonly customInspec: unique symbol;
    }

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
    interface TypedArray {
        readonly BYTES_PER_ELEMENT: number;
        readonly buffer: ArrayBufferLike;
        readonly byteLength: number;
        readonly byteOffset: number;
        readonly length: number;

        copyWithin(target: number, start?: number, end?: number): this;
        every(predicate: (value: number, index: number, array: this) => unknown, thisArg?: any): boolean;
        fill(value: number, start?: number, end?: number): this;
        filter(predicate: (value: number, index: number, array: this) => any, thisArg?: any): this;
        find(predicate: (value: number, index: number, obj: this) => boolean, thisArg?: any): number | undefined;
        findIndex(predicate: (value: number, index: number, obj: this) => boolean, thisArg?: any): number;
        forEach(callbackfn: (value: number, index: number, array: this) => void, thisArg?: any): void;
        indexOf(searchElement: number, fromIndex?: number): number;
        includes(searchElement: number, fromIndex?: number): boolean;
        join(separator?: string): string;
        lastIndexOf(searchElement: number, fromIndex?: number): number;
        map(callbackfn: (value: number, index: number, array: this) => number, thisArg?: any): this;
        reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number): number;
        reduce(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number, initialValue: number): number;
        reduce<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: this) => U, initialValue: U): U;
        reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number): number;
        reduceRight(callbackfn: (previousValue: number, currentValue: number, currentIndex: number, array: this) => number, initialValue: number): number;
        reduceRight<U>(callbackfn: (previousValue: U, currentValue: number, currentIndex: number, array: this) => U, initialValue: U): U;
        reverse(): this;
        set(array: ArrayLike<number>, offset?: number): void;
        slice(start?: number, end?: number): this;
        some(predicate: (value: number, index: number, array: this) => unknown, thisArg?: any): boolean;
        sort(compareFn?: (a: number, b: number) => number): this;
        subarray(begin?: number, end?: number): this;
        toLocaleString(): string;
        toString(): string;
        valueOf(): this;
        entries(): IterableIterator<[number, number]>;
        keys(): IterableIterator<number>;
        values(): IterableIterator<number>;

        [index: number]: number;
        [Symbol.iterator](): IterableIterator<number>;
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

Object.defineProperty(Symbol, "customInspec", { value: customInspect });
