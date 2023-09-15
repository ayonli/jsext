export function hasOwn(obj: any, key: string | number | symbol): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
};

/**
 * Returns `true` if the specified object has the indicated method as its own method (in its own
 * prototype). If the method is inherited, or is not in the prototype, or does not exist, this
 * function returns `false`.
 */
export function hasOwnMethod(obj: any, method: string | symbol): boolean {
    let proto = Object.getPrototypeOf(obj);
    return proto !== null
        && Object.prototype.hasOwnProperty.call(proto, method)
        && typeof proto[method] === "function";
}

/**
 * Copies the key-value pairs that are presented in the source objects but are missing in
 * the target object into the target, later pairs are skipped if the same key already exists.
 * 
 * This function mutates the target object and returns it.
 */
export function patch<T extends {}, U>(target: T, source: U): T & U;
export function patch<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
export function patch<T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
export function patch(target: object, ...sources: any[]): any;
export function patch(target: any, ...sources: any[]) {
    for (const source of sources) {
        for (const key of Reflect.ownKeys(source)) {
            if (!hasOwn(target, key) || target[key] === undefined) {
                target[key] = source[key];
            }
        }
    }

    return target;
};

/** Creates an object composed of the picked keys. */
export function pick<T extends object, U extends keyof T>(obj: T, keys: U[]): Pick<T, U>;
export function pick<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
export function pick(obj: any, keys: (string | symbol)[]) {
    return keys.reduce((result: any, key: string | symbol) => {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key];
        }

        return result;
    }, {});
}

/**
 * Creates an object composed without the picked keys.
 * 
 * NOTE: this function only collect keys from the object's own properties, except for type
 * Error, whose `name`, `message` and `cause` are always collected.
 */
export function omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>;
export function omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
export function omit(obj: any, keys: (string | symbol)[]) {
    const allKeys = Reflect.ownKeys(obj);
    const keptKeys = allKeys.filter(key => !keys.includes(key));
    const result = pick(obj, keptKeys);

    // special treatment for Error types
    if (obj instanceof Error) {
        ["name", "message", "cause"].forEach(key => {
            if (!keys.includes(key) &&
                (obj as any)[key] !== undefined &&
                !hasOwn(result, key)
            ) {
                result[key] = (obj as any)[key];
            }
        });
    }

    return result;
}
