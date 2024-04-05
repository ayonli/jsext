import _try from "./try.ts";
import func from "./func.ts";
import wrap from "./wrap.ts";
import mixin from "./mixin.ts";
import throttle from "./throttle.ts";
import debounce from "./debounce.ts";
import queue, { Queue } from "./queue.ts";
import lock, { Mutex } from "./lock.ts";
import read from "./read.ts";
import readAll from "./readAll.ts";
import chan, { Channel } from "./chan.ts";
import parallel from "./parallel.ts";
import run from "./run.ts";
import example from "./example.ts";
import deprecate from "./deprecate.ts";
import { isClass, isSubclassOf } from "./class.ts";

export {
    /** @deprecated import `Channel` from `@ayonli/jsext/chan` instead. */
    Channel,
    /** @deprecated import `Queue` from `@ayonli/jsext/queue` instead. */
    Queue,
    /** @deprecated import `Mutex` from `@ayonli/jsext/lock` instead. */
    Mutex
};

/** This is the very constructor/class of all async functions. */
export const AsyncFunction = (async function () { }).constructor as AsyncFunctionConstructor;
export interface AsyncFunction {
    (...args: any[]): Promise<unknown>;
    readonly length: number;
    readonly name: string;
}

/** This is the very constructor/class of all async generator functions. */
export const AsyncGeneratorFunction = (async function* () { }).constructor as AsyncGeneratorFunctionConstructor;
export interface AsyncFunctionConstructor {
    new(...args: any[]): AsyncFunction;
    (...args: any[]): AsyncFunction;
    readonly length: number;
    readonly name: string;
    readonly prototype: AsyncFunction;
}

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

/**
 * The entry of jsext major functions.
 */
const jsext = {
    _try,
    /** @deprecated use `_try` instead */
    try: _try,
    func,
    wrap,
    mixin,
    throttle,
    debounce,
    queue,
    lock,
    read,
    readAll,
    chan,
    parallel,
    run,
    example,
    deprecate,
    /** @deprecated import `isClass` from `@ayonli/jsext/class` instead. */
    isClass,
    /** @deprecated import `isSubclassOf` from `@ayonli/jsext/class` instead. */
    isSubclassOf,
    /** @deprecated use `mixin` instead */
    mixins: mixin,
};

export {
    jsext as default,
    _try,
    func,
    wrap,
    mixin,
    throttle,
    debounce,
    queue,
    lock,
    read,
    readAll,
    chan,
    parallel,
    run,
    example,
    deprecate,
    /** @deprecated import `isClass` from `@ayonli/jsext/class` instead. */
    isClass,
    /** @deprecated import `isSubclassOf` from `@ayonli/jsext/class` instead. */
    isSubclassOf,
};

/** @deprecated use `mixin` instead */
export const mixins = mixin;
