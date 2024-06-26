/**
 * Case-insensitive map, keys are case-insensitive.
 *
 * @example
 * ```ts
 * import { CiMap } from "@ayonli/jsext/collections";
 *
 * const map = new CiMap<string, string>();
 *
 * map.set("foo", "hello");
 * map.set("bar", "world");
 *
 * console.log(map.get("FOO")); // hello
 * console.log(map.has("BAR")); // true
 * ```
 */
class CiMap extends Map {
    get [Symbol.toStringTag]() {
        return "CiMap";
    }
    constructor(iterable = null) {
        super();
        if (iterable) {
            for (const [key, value] of iterable) {
                this.set(key, value);
            }
        }
    }
    set(key, value) {
        const id = String(key).toLowerCase();
        super.set(id, { key, value });
        return this;
    }
    get(key) {
        var _a;
        const id = String(key).toLowerCase();
        return (_a = super.get(id)) === null || _a === void 0 ? void 0 : _a.value;
    }
    has(key) {
        const id = String(key).toLowerCase();
        return super.has(id);
    }
    delete(key) {
        const id = String(key).toLowerCase();
        return super.delete(id);
    }
    *entries() {
        for (const { key, value } of super.values()) {
            yield [key, value];
        }
    }
    *keys() {
        for (const { key } of super.values()) {
            yield key;
        }
    }
    *values() {
        for (const { value } of super.values()) {
            yield value;
        }
    }
    forEach(callbackfn, thisArg) {
        super.forEach(({ key, value }) => {
            callbackfn(value, key, this);
        }, thisArg);
    }
    [Symbol.iterator]() {
        return this.entries();
    }
}

export { CiMap as default };
//# sourceMappingURL=CiMap.js.map
