declare const inverse: unique symbol;
/** Bi-directional map, keys and values are unique and map to each other. */
export default class BiMap<K, V> extends Map<K, V> {
    [inverse]: Map<V, K>;
    get [Symbol.toStringTag](): string;
    constructor(iterable?: Iterable<readonly [K, V]> | null);
    set(key: K, value: V): this;
    getKey(value: V): K | undefined;
    hasValue(value: V): boolean;
    deleteValue(value: V): boolean;
    clear(): void;
}
export {};
