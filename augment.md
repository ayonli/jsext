## Augmentations

This package supports augmenting some categories' functions to the corresponding
built-in types/namespaces, but they should only be used for application
development, don't use them when developing libraries.

_NOTE: this feature is only available by the NPM package or in the Browser,_
_They don't work by the JSR package._

```js
// import all
import "@ayonli/jsext/augment";

// import individual category
import "@ayonli/jsext/augment/string";
import "@ayonli/jsext/augment/number";
import "@ayonli/jsext/augment/array";
import "@ayonli/jsext/augment/uint8array";
import "@ayonli/jsext/augment/object";
import "@ayonli/jsext/augment/json";
import "@ayonli/jsext/augment/math";
import "@ayonli/jsext/augment/promise";
import "@ayonli/jsext/augment/error";
import "@ayonli/jsext/augment/collections";
```

### Augment String

- `String`
  - `compare(str1: string, str2: string): -1 | 0 | 1`
  - `random(length: number, chars?: string): string`
  - `prototype`
    - `count(sub: string): number`
    - `capitalize(all?: boolean): string`
    - `hyphenate(): string`
    - `bytes(): ByteArray`
    - `chars(): string[]`
    - `words(): string[]`
    - `lines(): string[]`
    - `chunk(length: number): string[]`
    - `truncate(length: number): string`
    - `trim(chars?: string): string`
    - `trimEnd(chars?: string): string`
    - `trimStart(chars?: string): string`
    - `stripEnd(suffix: string): string`
    - `stripStart(prefix: string): string`
    - `byteLength(): number`
    - `isAscii(printableOnly?: boolean): boolean`

### Augment Number

- `Number`
  - `isFloat(value: unknown): boolean`
  - `isNumeric(value: unknown): boolean`
  - `isBetween(value: number, [min, max]: [number, number]): boolean`
  - `random(min: number, max: number): number`
  - `range(min: number, max: number, step?: number): Generator<number, void, unknown>`
  - `serial(loop?: boolean): Generator<number, void, unknown>`

### Augment Array

- `Array<T>`
  - `prototype`
    - `first(): T | undefined`
    - `last(): T | undefined`
    - `random(remove?: boolean): T | undefined`
    - `count(item: T): number`
    - `equals(another: T[]): boolean`
    - `split(delimiter: T): T[][]`
    - `chunk(length: number): T[][]`
    - `uniq(): T[]`
    - `uniqBy<K extends string | number | symbol>(fn: (item: T, i: number) => K): T[]`
    - `shuffle(): T[]`
    - `toShuffled(): T[]`
    - `toReversed(): T[]`
    - `toSorted(fn?: ((a: T, b: T) => number) | undefined): T[]`
    - `orderBy(key: keyof T, order?: "asc" | "desc"): T[]`
    - `orderBy(fn: (item: T, i: number) => string | number | bigint, order?: "asc" | "desc"): T[]`
    - `groupBy<K extends string | number | symbol>(fn: (item: T, i: number) => K, type?: ObjectConstructor): Record<K, T[]>`
    - `groupBy<K>(fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T[]>`
    - `keyBy<K extends string | number | symbol>(fn: (item: T, i: number) => K, type?: ObjectConstructor): Record<K, T>`
    - `keyBy<K>(fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T>`

### Augment Uint8Array

- `Uint8Array`
  - `copy(src: Uint8Array, dest: Uint8Array): number`
  - `concat<T extends Uint8Array>(...arrays: T[]): T`
  - `compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1`
  - `prototype`
    - `equals(another: Uint8Array): boolean`
    - `split(delimiter: number): this[]`
    - `chunk(length: number): this[]`

### Augment Object

- `Object`
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
  - `as(value: unknown, type: StringConstructor): string | null`
  - `as(value: unknown, type: NumberConstructor): number | null`
  - `as(value: unknown, type: BigIntConstructor): bigint | null`
  - `as(value: unknown, type: BooleanConstructor): boolean | null`
  - `as(value: unknown, type: SymbolConstructor): symbol | null`
  - `as<T>(value: unknown, type: Constructor<T>): T | null`
  - `typeOf<T>(value: T): TypeNames | Constructor<T>`
  - `isValid(value: unknown): boolean`
  - `isPlainObject(value: unknown): value is { [x: string | symbol]: any; }`
  - `sanitize<T extends object>(obj: T, deep?: boolean, options?: { removeNulls?: boolean; removeEmptyStrings?: boolean; removeEmptyObjects?: boolean; removeArrayItems?: boolean; }): T`
  - `sortKeys<T extends object>(obj: T, deep?: boolean): T`
  - `flatKeys<T extends object>(obj: T, depth = 1, options?: { flatArrayIndices?: boolean; }): OmitChildrenNodes<T> & Record<string | number | symbol, any>`

### Augment JSON

- `JSON`
  - `parseAs(text: string, type: StringConstructor): string | null`
  - `parseAs(text: string, type: NumberConstructor): number | null`
  - `parseAs(text: string, type: BigIntConstructor): bigint | null`
  - `parseAs(text: string, type: BooleanConstructor): boolean | null`
  - `parseAs<T>(text: string, type: Constructor<T> & { fromJSON?(data: any): T; }): T | null`
  - `as(data: unknown, type: StringConstructor): string | null`
  - `as(data: unknown, type: NumberConstructor): number | null`
  - `as(data: unknown, type: BigIntConstructor): bigint | null`
  - `as(data: unknown, type: BooleanConstructor): boolean | null`
  - `as<T>(data: unknown, type: Constructor<T> & { fromJSON?(data: any): T; }): T | null`
  - `type(ctor: Constructor<any>): PropertyDecorator`

### Augment Math

- `Math`
  - `sum(...values: number[]): number`
  - `avg(...values: number[]): number`
  - `product(...values: number[]): number`

### Augment Promise

- `Promise`
  - `timeout<T>(value: T | PromiseLike<T>, ms: number): Promise<T>`
  - `after<T>(value: T | PromiseLike<T>, ms: number): Promise<T>`
  - `sleep(ms: number): Promise<void>`
  - `until(test: () => boolean | Promise<boolean>): Promise<void>`

### Augment Error

- `Error`
  - `toObject<T extends Error>(err: T): { [x: string | symbol]: any; }`
  - `fromObject<T extends Error>(obj: { [x: string | symbol]: any; }, ctor?: Constructor<T>): T`
  - `toErrorEvent(err: Error, type?: string): ErrorEvent`
  - `fromErrorEvent<T extends Error>(event: ErrorEvent): T | null`
  - `prototype`
    - `toJSON(): { [x: string | symbol]: any; }`

- `globalThis`
  - `Exception` (extends `Error`)
    - `cause?: unknown`
    - `code: number`

### Augment Collections

- `globalThis`
  - `BiMap<K, V>` (extends `Map<K, V>`) map to each other.
    - `prototype` (additional)
      - `getKey(value: V): K | undefined`
      - `hasValue(value: V): boolean`
      - `deleteValue(value: V): boolean`
  - `CiMap<K extends string, V>` (extends `Map<K, any>`)
