export { };

declare global {
    interface ObjectConstructor {
        hasOwn(obj: any, key: string | number | symbol): boolean;
        /**
         * Copies the key-value pairs that are presented in the source objects but are missing in
         * the target object into the target, later pairs are skipped if the same key already exists.
         * 
         * This function mutates the target object and returns it.
         */
        patch<T extends {}, U>(target: T, source: U): T & U;
        patch<T extends {}, U, V>(target: T, source1: U, source2: V): T & U & V;
        patch<T extends {}, U, V, W>(target: T, source1: U, source2: V, source3: W): T & U & V & W;
        patch(target: object, ...sources: any[]): any;
        /** Creates an object composed of the picked keys. */
        pick<T extends object, U extends keyof T>(obj: T, keys: U[]): Pick<T, U>;
        pick<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
        /**
         * Creates an object composed without the picked keys.
         * 
         * NOTE: this function only collect keys from the object's own properties, except for type
         * Error, whose `name` and `message` are always collected.
         */
        omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>;
        omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
    }
}

if (!Object.hasOwn) {
    Object.hasOwn = function (obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    };
}

Object.patch = function (target: any, ...sources: any[]) {
    for (const source of sources) {
        for (const key of Reflect.ownKeys(source)) {
            if (!Object.hasOwn(target, key) || target[key] === undefined) {
                target[key] = source[key];
            }
        }
    }

    return target;
};

Object.pick = function (obj: any, keys: (string | symbol)[]) {
    return keys.reduce((result: any, key: string | symbol) => {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key];
        }

        return result;
    }, {});
};

Object.omit = function (obj: any, keys: (string | symbol)[]) {
    const allKeys = Reflect.ownKeys(obj);
    const keptKeys = allKeys.filter(key => !keys.includes(key));
    const result = Object.pick(obj, keptKeys);

    // special treatment for Error types
    if (obj instanceof Error) {
        ["name", "message"].forEach(key => {
            if (!keys.includes(key) &&
                (obj as any)[key] !== undefined &&
                !Object.hasOwn(result, key)
            ) {
                result[key] = (obj as any)[key];
            }
        });
    }

    return result;
};
