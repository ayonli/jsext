import _try from "./try.ts";
import func from "./func.ts";
import wrap from "./wrap.ts";
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
import { isClass, isSubclassOf, mixin } from "./class.ts";
import mixins from "./mixins.ts";

export { Channel, Queue, Mutex };
export const AsyncFunction = (async function () { }).constructor as AsyncFunctionConstructor;
export const AsyncGeneratorFunction = (async function* () { }).constructor as AsyncGeneratorFunctionConstructor;

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

export interface Constructor<T = object> extends Function {
    new(...args: any[]): T;
    prototype: T;
}

export interface RealArrayLike<T> extends ArrayLike<T> {
    slice(start?: number, end?: number): RealArrayLike<T>;
}

export interface TypedArray extends Array<number> {
    readonly buffer: ArrayBufferLike;
    readonly byteLength: number;
    subarray(begin?: number, end?: number): TypedArray;
}

export type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
export type Ensured<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

/**
 * The entry of jsext main functions.
 */
const jsext = {
    _try,
    /** @deprecated use `_try` instead */
    try: _try,
    func,
    wrap,
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
    isClass,
    isSubclassOf,
    mixin,
    mixins,
};

export {
    jsext as default,
    _try,
    func,
    wrap,
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
    isClass,
    isSubclassOf,
    mixin,
    mixins,
};
