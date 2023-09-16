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

- `throttle<T, Fn extends (this: T, ...args: any[]) => any>(handler: Fn, duration: number): Fn`
- `throttle<T, Fn extends (this: T, ...args: any[]) => any>(handler: Fn, options: { duration: number; for?: any }): Fn`

- `mixins<T extends Constructor<any>, M extends any[]>(base: T, ...mixins: { [X in keyof M]: Constructor<M[X]> }): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>`
- `mixins<T extends Constructor<any>, M extends any[]>(base: T, ...mixins: M): T & Constructor<UnionToIntersection<FlatArray<M, 1>>>`

- `read<I extends AsyncIterable<any>>(iterable: I): I`
- `read(es: EventSource, options?: { event?: string; }): AsyncIterable<string>`
- `read<T extends Uint8Array | string>(ws: WebSocket): AsyncIterable<T>`
- `read<T>(target: EventTarget, eventMap?: { message?: string; error?: string; close?: string; }): AsyncIterable<T>`
- `read<T>(target: NodeJS.EventEmitter, eventMap?: { data?: string; error?: string; close?: string; }): AsyncIterable<T>`

- `run<T, A extends any[] = any[]>(script: string, args?: A, options?: { fn?: string; timeout?: number; adapter?: "worker_threads" | "child_process" }): Promise<{ workerId: number; abort(): Promise<void>; result(): Promise<T>; iterate(): AsyncIterable<T>; }>`

See [index.d.ts](./index.d.ts) for details and docs.

## Sub-packages

### [string](./string/index.d.ts)

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

**[Augmentation](./string/augment.d.ts)**

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

### [number](./number/index.d.ts)

```ts
import { isFloat, random } from "@ayonli/jsext/number";
// or
import "@ayonli/jsext/number/augment";
```

**Functions**

- `isFloat(value: unknown): boolean`
- `random(min: number, max: number): number`
- `sequence(min: number, max: number, step?: number, loop?: boolean): Generator<number, void, unknown>`

*When [augment](./number/augment.d.ts)ing, these functions will be attached to the `Number` constructor.*

### [array](./array/index.d.ts)

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

**[Augmentation](./array/augment.d.ts)**

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

### [uint8array](/uint8array/index.d.ts)

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

**[Augmentation](./uint8array/augment.d.ts)**

- `Uint8Array`
    - `compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1`
    - `prototype`
        - `equals(another: Uint8Array): boolean`
        - `split(delimiter: number): this[]`
        - `chunk(length: number): this[]`

### [object](./object/index.d.ts)

```ts
import { hasOwn, pathc, /* ... */ } from "@ayonli/jsext/object";
// or
import "@ayonli/jsext/object/augment";
```

**Functions**

- `hasOwn(obj: any, key: string | number | symbol): boolean`
- `hasOwnMethod(obj: any, method: string | symbol): boolean`
- `patch<T extends {}, U>(target: T, source: U): T & U`
- `patch<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V`
- `patch<T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W`
- `patch(target: object, ...sources: any[]): any`
- `pick<T extends object, U extends keyof T>(obj: T, keys: U[]): Pick<T, U>`
- `pick<T>(obj: T, keys: (string | symbol)[]): Partial<T>`
- `omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>`
- `omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>`
- `as(obj: any, type: StringConstructor): string | null`
- `as(obj: any, type: NumberConstructor): number | null`
- `as(obj: any, type: BigIntConstructor): bigint | null`
- `as(obj: any, type: BooleanConstructor): boolean | null`
- `as(obj: any, type: SymbolConstructor): symbol | null`
- `as<T>(obj: any, type: Constructor<T>): T | null`

*When [augment](./object/augment.d.ts)ing, these functions will be attached to the `Object` constructor.*

### [math](./math/index.d.ts)

```ts
import { sum, avg, product } from "@ayonli/jsext/math";
// or
import "@ayonli/jsext/math/augment";
```

**Functions**

- `sum(...values: number[]): number`
- `avg(...values: number[]): number`
- `product(...values: number[]): number`

*When [augment](./math/augment.d.ts)ing, these functions will be attached to the `Math` namespace.*

### [promise](./promise/index.d.ts)

```ts
import { timeout, after, sleep, until } from "@ayonli/jsext/promise";
// or
import "@ayonli/jsext/promise/augment";
```

**Functions**

- `timeout<T>(value: T | PromiseLike<T>, ms: number): Promise<T>`
- `after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>`
- `sleep(ms: number): Promise<void>`
- `until(test: () => boolean | Promise<boolean>): Promise<void>`

*When [augment](./promise/augment.d.ts)ing, these functions will be attached to the `Promise` constructor.*

### [collections](./collections/index.d.ts)

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

*When [augment](./collections/augment.d.ts)ing, these types will be exposed to the global namespace.*

### [error](./error/index.d.ts)

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

*When [augment](./error/augment.d.ts)ing, these types will be exposed to the global namespace.*

**Functions**

- `toObject<T extends Error>(err: T): { [x: string | symbol]: any; }`
- `fromObject<T extends Error>(obj: { [x: string | symbol]: any; }): T`

**[Augmentation](./error/augment.d.ts)**

- `Error`
    - `toObject<T extends Error>(err: T): { [x: string | symbol]: any; }`
    - `fromObject<T extends Error>(obj: { [x: string | symbol]: any; }): T`
    - `prototype`
        - `toJSON(): { [x: string | symbol]: any; }`

## Import all sub-package augmentation at once

```ts
import "@ayonli/jsext/augment";
```

## When to use augmentations

If we're developing libraries and share them openly on NPM, in order to prevent collision, it's
better not to use augmentations, but use the corresponding functions from the sub-packages instead.

But if we're developing private projects, using augmentations can save a lot of time, it's easier to
read and write, and make sense.

## Web Support

When using this package in the browser, there are three ways to import this package.

1. Import From `node_modules`

This is the same as above, but requires a module bundler such as webpack.

2. Load ES Module

```html
<script type="module">
    import jsext from "https://deno.land/x/ayonli_jsext/esm/index.js";
    // this will also include the augmentations
</script>
```

Note: the ES module can be used Node.js and Deno as well.

3. Load Bundle

```html
<script src="https://deno.land/x/ayonli_jsext/bundle/index.js"></script>
<script>
    const { default: jsext } = window["@ayonli/jsext"];
    // this will also include the augmentations
<script>
```
