declare const internal: unique symbol;
/** Case-insensitive map, keys are case-insensitive. */
export default class CiMap<K extends string, V> implements Map<K, V> {
    [internal]: Map<string, {
        key: K;
        value: V;
    }>;
    get [Symbol.toStringTag](): string;
    get size(): number;
    constructor(iterable?: Iterable<readonly [K, V]> | null);
    set(key: K, value: V): this;
    get(key: K): V | undefined;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    entries(): IterableIterator<[K, V]>;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
    [Symbol.iterator](): IterableIterator<[K, V]>;
}
export {};
