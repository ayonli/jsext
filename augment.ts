import "./string/augment";
import "./number/augment";
import "./array/augment";
import "./uint8array/augment";
import "./object/augment";
import "./math/augment";
import "./promise/augment";
import "./collections/augment";
import "./error/augment";
import { AsyncFunction, AsyncGeneratorFunction } from ".";

declare global {
    const AsyncFunction: AsyncFunctionConstructor;
    const AsyncGeneratorFunction: AsyncGeneratorFunctionConstructor;

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

    interface Constructor<T> extends Function {
        new(...args: any[]): T;
        prototype: T;
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
