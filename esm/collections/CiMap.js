const internal = Symbol("internal");
/** Case-insensitive map, keys are case-insensitive. */
class CiMap {
    get [Symbol.toStringTag]() {
        return "CiMap";
    }
    get size() {
        return this[internal].size;
    }
    constructor(iterable = null) {
        this[internal] = new Map();
        if (iterable) {
            for (const [key, value] of iterable) {
                this.set(key, value);
            }
        }
    }
    set(key, value) {
        const id = String(key).toLowerCase();
        this[internal].set(id, { key, value });
        return this;
    }
    get(key) {
        var _a;
        const id = String(key).toLowerCase();
        return (_a = this[internal].get(id)) === null || _a === void 0 ? void 0 : _a.value;
    }
    has(key) {
        const id = String(key).toLowerCase();
        return this[internal].has(id);
    }
    delete(key) {
        const id = String(key).toLowerCase();
        return this[internal].delete(id);
    }
    clear() {
        this[internal].clear();
    }
    *entries() {
        for (const { key, value } of this[internal].values()) {
            yield [key, value];
        }
    }
    *keys() {
        for (const { key } of this[internal].values()) {
            yield key;
        }
    }
    *values() {
        for (const { value } of this[internal].values()) {
            yield value;
        }
    }
    forEach(callbackfn, thisArg) {
        this[internal].forEach(({ key, value }) => {
            callbackfn(value, key, this);
        }, thisArg);
    }
    [Symbol.iterator]() {
        return this.entries();
    }
}

export { CiMap as default };
//# sourceMappingURL=CiMap.js.map
