/**
 * The missing utility types for TypeScript.
 * @module
 */

/** This is the very constructor/class of all async functions. */
export const AsyncFunction = (async function () { }).constructor as AsyncFunctionConstructor;
export interface AsyncFunction {
    (...args: any[]): Promise<unknown>;
    readonly length: number;
    readonly name: string;
}

export interface AsyncFunctionConstructor {
    new(...args: any[]): AsyncFunction;
    (...args: any[]): AsyncFunction;
    readonly length: number;
    readonly name: string;
    readonly prototype: AsyncFunction;
}

/** This is the very constructor/class of all async generator functions. */
export const AsyncGeneratorFunction = (async function* () { }).constructor as AsyncGeneratorFunctionConstructor;

/** This interface represents the constructor/class of the given `T` type. */
export interface Constructor<T = object> extends Function {
    new(...args: any[]): T;
    prototype: T;
}

/** A real-array-like object is an array-like object with a `slice` method. */
export interface RealArrayLike<T> extends ArrayLike<T> {
    slice(start?: number, end?: number): RealArrayLike<T>;
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
 */
export interface TypedArray extends Array<number> {
    readonly buffer: ArrayBufferLike;
    readonly byteLength: number;
    readonly byteOffset: number;
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
export type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;

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
export type Ensured<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;
