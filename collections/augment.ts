
import { BiMap, CiMap } from "./index.ts";

declare global {
    class BiMap<K, V> extends Map<K, V> {
        getKey(value: V): K | undefined;
        hasValue(value: V): boolean;
        deleteValue(value: V): boolean;
    }

    class CiMap<K extends string, V> implements Map<K, V> {
        readonly [Symbol.toStringTag]: "CiMap";
        readonly size: number;
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
}

// @ts-ignore
globalThis["BiMap"] = BiMap;
// @ts-ignore
globalThis["CiMap"] = CiMap;
