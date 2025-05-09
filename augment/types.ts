import { AsyncFunction, GeneratorFunction, AsyncGeneratorFunction, TypedArray } from "../types.ts";

declare global {
    /** This interface represents the constructor/class of the given `T` type. */
    interface Constructor<T = object> extends Function {
        new(...args: any[]): T;
        prototype: T;
    }

    /** This interface represents the abstract constructor/class of the given `T` type. */
    interface AbstractConstructor<T = object> extends Function {
        prototype: T;
    }

    /**
     * This is the very constructor/class of all async functions.
     * 
     * @example
     * ```ts
     * async function foo() {
     *       // ...
     * }
     * 
     * console.assert(foo instanceof AsyncFunction);
     * ```
     */
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

    /**
     * This is the very constructor/class of all generator functions.
     * 
     * @example
     * ```ts
     * function* foo() {
     *     // ...
     * }
     * 
     * console.assert(foo instanceof GeneratorFunction);
     * ```
     */
    const GeneratorFunction: GeneratorFunctionConstructor;

    /**
     * This is the very constructor/class of all async generator functions.
     * 
     * @example
     * ```ts
     * async function* foo() {
     *    // ...
     * }
     * 
     * console.assert(foo instanceof AsyncGeneratorFunction);
     * ```
     */
    const AsyncGeneratorFunction: AsyncGeneratorFunctionConstructor;

    interface SymbolConstructor {
        readonly customInspec: unique symbol;
    }

    /**
     * This is the superclass of all of all `TypedArray` subclasses, such as `Uint8Array`,
     * `Int16Array`, etc.
     * 
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
     * 
     * @example
     * ```ts
     * const arr = new Uint8Array(10);
     * console.assert(arr instanceof TypedArray);
     * ```
     */
    const TypedArray: AbstractConstructor<TypedArray>;
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
     * A sequence is an array-like object that can be sliced.
     */
    interface Sequence<T> extends ArrayLike<T> {
        slice(start?: number, end?: number): Sequence<T>;
    }

    /**
     * @deprecated Use {@link Sequence} instead.
     */
    type RealArrayLike<T> = Sequence<T>;

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
     * type UserPartial = PartialKeys<User, "age">; // { name: string; age?: number; }
     * ```
     */
    type PartialKeys<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

    /**
     * @deprecated Use {@link PartialKeys} instead.
     */
    type Optional<T, K extends keyof T> = PartialKeys<T, K>;

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
     * type UserRequired = RequiredKeys<User, "age">; // { name: string; age: number; }
     * ```
     */
    type RequiredKeys<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

    /**
     * @deprecated Use {@link RequiredKeys} instead.
     */
    type Ensured<T, K extends keyof T> = RequiredKeys<T, K>;

    /**
     * Returns the primitive value held by the given type if its a wrapper object,
     * otherwise returns the type itself.
     */
    type ValueOf<T> = T extends String ? string
        : T extends Number ? number
        : T extends Boolean ? boolean
        : T extends BigInt ? bigint
        : T extends Symbol ? symbol
        : T;

    /**
     * The `Comparable` interface is used to compare an object of the same class
     * with an instance of that class, it provides ordering of data for objects of
     * the user-defined class.
     * 
     * This interface is inspired by Java's `Comparable` interface.
     */
    interface Comparable {
        /**
         * Compares this object with another object for order. Returns `-1` if this
         * object is less than the other object, `0` if they are equal, and `1` if
         * this object is greater than the other object.
         */
        compareTo(other: this): -1 | 0 | 1;
    }

    /**
     * This utility type is used to convert an interface to a plain object type,
     * which will remove all non-symbol members.
     * 
     * NOTE: This type is experimental, use it with caution.
     * @experimental
     */
    type ToDict<T> = Omit<T, SymbolKeys<T>>;

    type SymbolKeys<T> = {
        [K in keyof T]: K extends symbol ? K : never;
    }[keyof T];

    const __brand: unique symbol;
    /**
     * Creates a unique type from the given type `T` with a brand, which can be used
     * to enhance type safety in TypeScript.
     * 
     * @example
     * ```ts
     * import { Branded } from "@ayonli/jsext/types";
     * 
     * type Email = Branded<string, "Email">;
     * 
     * function assertAcceptable(email: Email): never {
     *     // ...
     * }
     * 
     * const email = "the@ayon.li" as Email;
     * assertAcceptable(email); // OK
     * 
     * assertAcceptable("the@ayon.li") // Error
     * ```
     */
    type Branded<T, B> = T & { [__brand]: B; };

    type JSONPrimitive = string | number | boolean | null;
    type JSONArray = JSONValue[];
    type JSONObject = {
        [key: string]: JSONValue | undefined;
    };

    /**
     * The `JSONValue` type represents a value that can be serialized to JSON and
     * deserialized from JSON without losing information.
     */
    type JSONValue = JSONPrimitive | JSONArray | JSONObject;
}

// @ts-ignore
globalThis["AsyncFunction"] = AsyncFunction;
// @ts-ignore
globalThis["GeneratorFunction"] = GeneratorFunction;
// @ts-ignore
globalThis["AsyncGeneratorFunction"] = AsyncGeneratorFunction;
// @ts-ignore
globalThis["TypedArray"] = TypedArray;
