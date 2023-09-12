# JsExt

Additional functions added to JavaScript standard types that are frequently used in practice.

## Install

```sh
npm i @ayonli/jsext
```

## Usage

This package adds functions directly onto the builtin types like `String`, `Number`, etc. To use
them, import the target sub-module into the workspace, like this:

```ts
import "@ayonli/jsext/string";
import "@ayonli/jsext/number";
// ...
```

Or import all at once:

```ts
import "@ayonli/jsext";
```

> Some people may argue that it's a bad idea to patch methods / functions to the prototypes or
> constructors of the basic types. But after years of programming and designing APIs (not http
> endpoints, the real APIs), I've found it that the simplest way of coding is having things work out
> of the box.

## Functions

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

- `Number`
    - `isFloat(value: unknown): boolean`
    - `random(min: number, max: number): number`

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

- `Uint8Array`
    - `compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1`
    - `prototype`
        - `equals(another: Uint8Array): boolean`
        - `split(delimiter: number): this[]`
        - `chunk(length: number): this[]`

- `Object`
    - `hasOwn(obj: any, key: string | number | symbol): boolean`
    - `patch<T extends {}, U>(target: T, source: U): T & U`
    - `patch<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V`
    - `patch<T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W`
    - `patch(target: object, ...sources: any[]): any`
    - `pick<T extends object, U extends keyof T>(obj: T, keys: U[]): Pick<T, U>`
    - `pick<T>(obj: T, keys: (string | symbol)[]): Partial<T>`
    - `omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>`
    - `omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>`

- `Function`
    - `wrap<T, Fn extends (this: T, ...args: any[]) => any>(fn: Fn, wrapper: (this: T, fn: Fn, ...args: Parameters<Fn>) => ReturnType<Fn>): Fn`
    - `try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(fn: (...args: A) => AsyncGenerator<T, TReturn, TNext>, ...args: A): AsyncGenerator<[E, T], [E, TReturn], TNext>`
    - `try<E = Error, T = any, A extends any[] = any[], TReturn = any, TNext = unknown>(fn: (...args: A) => Generator<T, TReturn, TNext>, ...args: A): Generator<[E, T], [E, TReturn], TNext>`
    - `try<E = Error, R = any, A extends any[] = any[]>(fn: (...args: A) => Promise<R>, ...args: A): Promise<[E, R]>`
    - `try<E = Error, R = any, A extends any[] = any[]>(fn: (...args: A) => R, ...args: A): [E, R]`
    - `try<E = Error, T = any, TReturn = any, TNext = unknown>(gen: AsyncGenerator<T, TReturn, TNext>): AsyncGenerator<[E, T], [E, TReturn], TNext>`
    - `try<E = Error, T = any, TReturn = any, TNext = unknown>(gen: Generator<T, TReturn, TNext>): Generator<[E, T], [E, TReturn], TNext>`
    - `try<E = Error, R = any>(job: Promise<R>): Promise<[E, R]>`
    - `withDefer<T, R = any, A extends any[] = any[]>(fn: (this: T, defer: (cb: () => void) => void, ...args: A) => R): (this: T, ...args: A) => R`

- `Math`
    - `sum(...values: number[]): number`
    - `avg(...values: number[]): number`
    - `product(...values: number[]): number`

- `Promise`
    - `timeout<T>(value: T | Promise<T>, ms: number): Promise<T>`
    - `after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>`
    - `sleep(ms: number): Promise<void>`

## Sub-packages

**collections**

```ts
import BiMap from "@ayonli/jsext/collections/BiMap";
import CiMap from "@ayonli/jsext/collections/CiMap";
// or
import { BiMap, CiMap } from "@ayonli/jsext/collections";
```

- `BiMap<K, V>` (extends `Map<K, V>`) Bi-directional map, keys and values are unique and map to each
    other.
    - `prototype` (additional)
        - `getKey(value: V): K | undefined`
        - `hasValue(value: V): boolean`
        - `deleteValue(value: V): boolean`
- `CiMap<K extends string, V>` (implements `Map<K, V>`) Case-insensitive map, keys are
    case-insensitive.
