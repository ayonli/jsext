import { Pipeline } from "../pipe.ts";
import { ValueOf } from "../types.ts";

export interface Pipeable {
    /**
     * Calls a function using the current value as its argument and returns a
     * new {@link Pipeline} instance that holds the result.
     */
    pipe<R, A extends any[] = any[]>(fn: (value: ValueOf<this>, ...args: A) => R, ...args: A): Pipeline<R>;
}

declare global {
    interface String extends Pipeable { }
    interface Number extends Pipeable { }
    interface BigInt extends Pipeable { }
    interface Boolean extends Pipeable { }

    interface Array<T> extends Pipeable { }

    interface Map<K, V> extends Pipeable { }
    interface Set<T> extends Pipeable { }

    interface Error extends Pipeable { }
    interface Date extends Pipeable { }
    interface RegExp extends Pipeable { }
}

function pipe<R, A extends any[] = any[]>(
    this: any,
    fn: (value: any, ...args: A) => R,
    ...args: A
): Pipeline<R> {
    if ([String, Number, BigInt, Boolean, Symbol].includes(this.constructor)) {
        return new Pipeline(this.valueOf()).pipe(fn, ...args);
    } else {
        return new Pipeline(this).pipe(fn, ...args);
    }
};

String.prototype.pipe = pipe;
Number.prototype.pipe = pipe;
BigInt.prototype.pipe = pipe;
Boolean.prototype.pipe = pipe;

Array.prototype.pipe = pipe;

Map.prototype.pipe = pipe;
Set.prototype.pipe = pipe;

Error.prototype.pipe = pipe;
Date.prototype.pipe = pipe;
RegExp.prototype.pipe = pipe;
