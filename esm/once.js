const uninitialized = Symbol("uninitialized");
/**
 * Creates a function that performs lazy initialization on the first call and
 * returns the same result on subsequent calls.
 *
 * @example
 * ```ts
 * import once from "@ayonli/jsext/once";
 *
 * // sync
 * const getMap = once(() => new Map());
 * (() => {
 *     const map1 = getMap();
 *     map1.set("key", "value");
 *     console.log(map1.get("key")); // "value"
 *
 *     const map2 = getMap();
 *     console.log(map1 === map2); // true
 * })();
 *
 * // async
 * const getDb = once(async () => {
 *     const db = await connectToDb();
 *     return db;
 * });
 * (async () => {
 *     const db1 = await getDb();
 *     const result = await db1.query("SELECT * FROM users");
 *     console.log(result);
 *
 *     const db2 = await getDb();
 *     console.log(db1 === db2); // true
 * })();
 * ```
 */
function once(init) {
    let value = uninitialized;
    return () => {
        if (value === uninitialized) {
            value = init();
        }
        return value;
    };
}

export { once as default };
//# sourceMappingURL=once.js.map
