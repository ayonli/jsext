# JsExt

Additional functions for JavaScript programming in practice.

## Install

```sh
npm i @ayonli/jsext
```

## Usages

```ts
import jsext from "@ayonli/jsext";
```

## Functions

- `try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(fn: (...args: A) => AsyncGenerator<T, TReturn, TNext>, ...args: A): AsyncGenerator<[E, T], [E, TReturn], TNext>`
- `try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(fn: (...args: A) => Generator<T, TReturn, TNext>, ...args: A): Generator<[E, T], [E, TReturn], TNext>`
- `try<E = Error, R = any, A extends any[] = any[]>(fn: (...args: A) => Promise<R>, ...args: A): Promise<[E, R]>`
- `try<E = Error, R = any, A extends any[] = any[]>(fn: (...args: A) => R, ...args: A): [E, R]`
- `try<E = Error, T = any, TReturn = any, TNext = unknown>(gen: AsyncGenerator<T, TReturn, TNext>): AsyncGenerator<[E, T], [E, TReturn], TNext>`
- `try<E = Error, T = any, TReturn = any, TNext = unknown>(gen: Generator<T, TReturn, TNext>): Generator<[E, T], [E, TReturn], TNext>`
- `try<E = Error, R = any>(job: Promise<R>): Promise<[E, R]>`

- `func<T, R = any, A extends any[] = any[]>(fn: (this: T, defer: (cb: () => void) => void, ...args: A) => R): (this: T, ...args: A) => R`

- `wrap<T, Fn extends (this: T, ...args: any[]) => any>(fn: Fn, wrapper: (this: T, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>): Fn`

- `mixins<T, M extends any[]>(base: Constructor<T>, ...mixins: { [X in keyof M]: Constructor<M[X]> }): Constructor<UnionToIntersection<FlatArray<[T, M], 1>>>`

- `read<I extends AsyncIterable<any>>(iterable: I): I`
- `read(es: EventSource, options?: { event?: string; }): AsyncIterable<string>`
- `read<T extends Uint8Array | string>(ws: WebSocket): AsyncIterable<T>`
- `read<T>(target: EventTarget, eventMap?: { message?: string; error?: string; close?: string; }): AsyncIterable<T>`
- `read<T>(target: NodeJS.EventEmitter, eventMap?: { data?: string; error?: string; close?: string; }): AsyncIterable<T>`

```ts
/** Runs a task in the script in a worker thread that can be aborted during runtime. */
function run<R, A extends any[] = any[]>(script: string, args?: A, options?: {
    /** If not set, runs the default function, otherwise runs the specific function. */
    fn?: string;
    /** Automatically abort the task when timeout (in milliseconds). */
    timeout?: number;
    /**
     * Instead of dropping the worker after the task has completed, keep it alive so that it can
     * be reused by other tasks.
     */
    keepAlive?: boolean;
    /**
     * In browser, this option is ignored and will always use the web worker.
     */
    adapter?: "worker_threads" | "child_process";
}): Promise<{
    /** Terminates the worker and abort the task. */
    abort(): Promise<void>;
    /** Retrieves the return value of the function. */
    result(): Promise<R>;
    /** Iterates the yield value if the function returns a generator. */
    iterate(): AsyncIterable<R>;
}>;
```

## Sub-packages

### string

```ts
import { capitalize, chunk, /* ... */ } from "@ayonli/jsext/string";
// or
import "@ayonli/jsext/string/augment";
```

**Functions**

- `compare(str1: string, str2: string): -1 | 0 | 1`
- `random(length: number): string`
- `count(str: string, sub: string): number`
- `capitalize(str: string, all?: boolean): string`
- `hyphenate(str: string): string`
- `words(str: string): string[]`
- `chunk(str: string, length: number): string[]`
- `truncate(str: string, length: number): string`
- `byteLength(str: string): number`

**Augment**

- `String`
    - `compare(str1: string, str2: string): -1 | 0 | 1`
    - `random(length: number): string`
    - `prototype`
        - `count(sub: string): number`
        - `capitalize(all?: boolean): string`
        - `hyphenate(): string`
        - `words(): string[]`
        - `chunk(length: number): string[]`
        - `truncate(length: number): string`
        - `byteLength(): number`

### number

```ts
import { isFloat, random } from "@ayonli/jsext/number";
// or
import "@ayonli/jsext/number/augment";
```

**Functions**

- `isFloat(value: unknown): boolean`
- `random(min: number, max: number): number`
- `sequence(min: number, max: number, step?: number, loop?: boolean): Generator<number, void, unknown>`

*When augment, these functions will be attached to the `Number` constructor.*

### array

```ts
import { count, split, /* ... */ } from "@ayonli/jsext/array";
// or
import "@ayonli/jsext/array/augment";
```

**Functions**

- `count<T>(arr: RealArrayLike<T>, ele: T): number`
- `equals<T>(arr1: RealArrayLike<T>, arr2: RealArrayLike<T>): boolean`
- `split<T>(arr: RealArrayLike<T>, delimiter: T): RealArrayLike<T>[]`
- `chunk<T>(arr: RealArrayLike<T>, length: number): RealArrayLike<T>[]`
- `uniq<T>(arr: T[]): T[]`
- `shuffle<T>(arr: T[]): T[]`
- `orderBy<T>(arr: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[]`
- `groupBy<T>(arr: T[], fn: (item: T, i: number) => string | symbol, type?: ObjectConstructor): Record<string | symbol, T[]>`
- `groupBy<T, K extends string>(arr: T[], fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T[]>`

**Augment**

- `Array<T>`
    - `prototype`
        - `first(): T`
        - `last(): T`
        - `count(ele: T): number`
        - `equals(another: T[]): boolean`
        - `split(delimiter: T): T[][]`
        - `chunk(length: number): T[][]`
        - `uniq(): T[]`
        - `shuffle(): T[]`
        - `toShuffled(): T[]`
        - `toReversed(): T[]`
        - `toSorted(fn?: ((a: T, b: T) => number) | undefined): T[]`
        - `orderBy(key: keyof T, order?: "asc" | "desc"): T[]`
        - `groupBy(fn: (item: T, i: number) => string | symbol, type?: ObjectConstructor): Record<string | symbol, T[]>`
        - `groupBy<K>(fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T[]>`

### uint8array

```ts
import { compare, split, /* ... */ } from "@ayonli/jsext/uint8array";
// or
import "@ayonli/jsext/uint8array/augment";
```

**Functions**

- `compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1`
- `equals(arr1: Uint8Array, arr2: Uint8Array): boolean`
- `split<T extends Uint8Array>(arr: T, delimiter: number): T[]`
- `chunk<T extends Uint8Array>(arr: T, length: number): T[]`

**Augment**

- `Uint8Array`
    - `compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1`
    - `prototype`
        - `equals(another: Uint8Array): boolean`
        - `split(delimiter: number): this[]`
        - `chunk(length: number): this[]`

### object

```ts
import { hasOwn, pathc, /* ... */ } from "@ayonli/jsext/object";
// or
import "@ayonli/jsext/object/augment";
```

**Functions**

- `hasOwn(obj: any, key: string | number | symbol): boolean`
- `patch<T extends {}, U>(target: T, source: U): T & U`
- `patch<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V`
- `patch<T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W`
- `patch(target: object, ...sources: any[]): any`
- `pick<T extends object, U extends keyof T>(obj: T, keys: U[]): Pick<T, U>`
- `pick<T>(obj: T, keys: (string | symbol)[]): Partial<T>`
- `omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>`
- `omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>`

*When augment, these functions will be attached to the `Object` constructor.*

### math

```ts
import { sum, avg, product } from "@ayonli/jsext/math";
// or
import "@ayonli/jsext/math/augment";
```

**Functions**

- `sum(...values: number[]): number`
- `avg(...values: number[]): number`
- `product(...values: number[]): number`

*When augment, these functions will be attached to the `Math` namespace.*

### promise

```ts
import { timeout, after, sleep } from "@ayonli/jsext/promise";
// or
import "@ayonli/jsext/promise/augment";
```

**Functions**

- `timeout<T>(value: T | PromiseLike<T>, ms: number): Promise<T>`
- `after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>`
- `sleep(ms: number): Promise<void>`

*When augment, these functions will be attached to the `Promise` constructor.*

### collections

```ts
import BiMap from "@ayonli/jsext/collections/BiMap";
import CiMap from "@ayonli/jsext/collections/CiMap";
// or
import { BiMap, CiMap } from "@ayonli/jsext/collections";
// or
import "@ayonli/jsext/collections/augment";
```

**Types**

- `BiMap<K, V>` (extends `Map<K, V>`) Bi-directional map, keys and values are unique and map to each
    other.
    - `prototype` (additional)
        - `getKey(value: V): K | undefined`
        - `hasValue(value: V): boolean`
        - `deleteValue(value: V): boolean`
- `CiMap<K extends string, V>` (implements `Map<K, V>`) Case-insensitive map, keys are
    case-insensitive.

*When augment, these types will be exposed to the global namespace.*

### error

```ts
import Exception from "@ayonli/jsext/error/Exception";
// or
import { Exception } from "@ayonli/jsext/error";
// or
import "@ayonli/jsext/error/augment";
```

**Types**

- `Exception` (extends `Error`)
    - `cause?: unknown`
    - `code: number`

*When augment, these types will be exposed to the global namespace.*

**Functions**

- `toObject<T extends Error>(err: T): { [x: string | symbol]: any; }`
- `fromObject<T extends Error>(obj: { [x: string | symbol]: any; }): T`

**Augment**

- `Error`
    - `toObject<T extends Error>(err: T): { [x: string | symbol]: any; }`
    - `fromObject<T extends Error>(obj: { [x: string | symbol]: any; }): T`
    - `prototype`
        - `toJSON(): { [x: string | symbol]: any; }`

## Import All Sub-package Augments At Once

```ts
import "@ayonli/jsext/augment";
```

## Having trouble with ts-loader?

1. Set `module.rules.options.allowTsInNodeModules` as `true` for **ts-loader** in
    `webpack.config.js`;
2. Set `compilerOptions.rootDirs` as `["src", "node_modules/@ayonli/jsext"]` in `tsconfig.json`
    (`src` could be different for different projects), meanwhile, disable `compilerOptions.rootDir`.
