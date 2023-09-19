import _try from "./try.ts";
import func from "./func.ts";
import wrap from "./wrap.ts";
import throttle from "./throttle.ts";
import mixins from "./mixins.ts";
import isSubclassOf from "./isSubclassOf.ts";
import read from "./read.ts";
import run from "./run.ts";

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

export interface TypedArray extends Array<number> {
    readonly buffer: ArrayBufferLike;
    readonly byteLength: number;
    subarray(begin?: number, end?: number): TypedArray;
}

export type Optional<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>;
export type Ensured<T, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

const jsext = {
    try: _try,
    func,
    wrap,
    throttle,
    mixins,
    isSubclassOf,
    read,
    run,
};
export default jsext;
