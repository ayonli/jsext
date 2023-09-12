const internal = Symbol("internal");

/** Case-insensitive map, keys are case-insensitive. */
export default class CiMap<K extends string, V> implements Map<K, V> {
    [internal]: Map<string, { key: K, value: V; }>;

    get [Symbol.toStringTag]() {
        return "CiMap";
    }

    get size() {
        return this[internal].size;
    }

    constructor(iterable: Iterable<readonly [K, V]> | null = null) {
        this[internal] = new Map<string, { key: K, value: V; }>();

        if (iterable) {
            for (const [key, value] of iterable) {
                this.set(key, value);
            }
        }
    }

    set(key: K, value: V): this {
        const id = String(key).toLowerCase();
        this[internal].set(id, { key, value });
        return this;
    }

    get(key: K): V | undefined {
        const id = String(key).toLowerCase();
        return this[internal].get(id)?.value;
    }

    has(key: K): boolean {
        const id = String(key).toLowerCase();
        return this[internal].has(id);
    }

    delete(key: K): boolean {
        const id = String(key).toLowerCase();
        return this[internal].delete(id);
    }

    clear(): void {
        this[internal].clear();
    }

    * entries(): IterableIterator<[K, V]> {
        for (const { key, value } of this[internal].values()) {
            yield [key, value];
        }
    }

    * keys(): IterableIterator<K> {
        for (const { key } of this[internal].values()) {
            yield key;
        }
    }

    * values(): IterableIterator<V> {
        for (const { value } of this[internal].values()) {
            yield value;
        }
    }

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        this[internal].forEach(({ key, value }) => {
            callbackfn(value, key, this);
        }, thisArg);
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries();
    }
}
