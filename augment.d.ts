import "./string/augment";
import "./number/augment";
import "./array/augment";
import "./uint8array/augment";
import "./object/augment";
import "./math/augment";
import "./promise/augment";
import "./collections/augment";
import "./error/augment";
import jsext from "./index";
export default jsext;
declare global {
    interface Constructor<T> extends Function {
        new (...args: any[]): T;
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
