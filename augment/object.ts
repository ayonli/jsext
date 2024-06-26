import {
    hasOwn,
    hasOwnMethod,
    omit,
    patch,
    pick,
    as,
    typeOf,
    TypeNames,
    isValid,
    isPlainObject,
    sanitize,
    sortKeys,
    flatKeys,
    OmitChildrenNodes,
    filterEntries,
    mapEntries,
    partitionEntries,
    invert,
} from "../object.ts";

declare global {
    interface ObjectConstructor {
        hasOwn(obj: any, key: string | number | symbol): boolean;
        /**
         * Returns `true` if the specified object has the indicated method as its own method (in its
         * own prototype). If the method is inherited, or is not in the prototype, or does not exist,
         * this function returns `false`.
         */
        hasOwnMethod(obj: any, method: string | symbol): boolean;
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
         * **NOTE:**
         * This function only collect keys from the object's own properties, except for type Error,
         * whose `name`, `message` and `cause` are always collected.
         */
        omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>;
        omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
        /**
         * Checks if the value is an instance of the given type, returns the value itself if passed,
         * otherwise returns `null`. This function is mainly used for the optional chaining syntax.
         * @example
         * ```ts
         * try {
         *     // ... do something
         * } catch (err) {
         *     console.error(Object.as(err, Error)?.message ?? String(err));
         * }
         * ```
         */
        as(value: unknown, type: StringConstructor): string | null;
        as(value: unknown, type: NumberConstructor): number | null;
        as(value: unknown, type: BigIntConstructor): bigint | null;
        as(value: unknown, type: BooleanConstructor): boolean | null;
        as(value: unknown, type: SymbolConstructor): symbol | null;
        as<T>(value: unknown, type: Constructor<T>): T | null;
        /**
         * Returns a string representation or the constructor of the value's type.
         * 
         * **NOTE:** This function returns `"class"` for ES6 classes.
         * 
         * **NOTE:** This function returns `"null"` for `null`.
         * 
         * **NOTE:** This function returns `Object` for `Object.create(null)`.
         */
        typeOf<T>(value: T): TypeNames | Constructor<T>;
        /**
         * Returns `true` if the given value is valid. The following values are considered invalid:
         * 
         * - `undefined`
         * - `null`
         * - `NaN`
         * - `Invalid Date`
         */
        isValid(value: unknown): boolean;
        /**
         * Returns `true` is the given value is a plain object, that is, an object created by
         * the `Object` constructor or one with a `[[Prototype]]` of `null`.
         */
        isPlainObject(value: unknown): value is { [x: string | symbol]: any; };
        /**
         * Creates an object base on the original object but without any invalid values
         * (except for `null`), and trims the value if it's a string.
         */
        sanitize<T extends object>(obj: T, deep?: boolean, options?: {
            removeNulls?: boolean;
            removeEmptyStrings?: boolean;
            removeEmptyObjects?: boolean;
            removeArrayItems?: boolean;
        }): T;
        /**
         * Creates an object with sorted keys (in ascending order) of the original object.
         * 
         * **NOTE:** Symbol keys are not sorted and remain their original order.
         */
        sortKeys<T extends object>(obj: T, deep?: boolean): T;
        /**
         * Create an object with flatted keys of the original object, the children
         * nodes' properties will be transformed to a string-represented path.
         * 
         * **NOTE:** This function only operates on plain objects and arrays.
         * 
         * @param depth Default value: `1`.
         * @example
         * ```ts
         * const obj = Object.flatKeys({ foo: { bar: "hello", baz: "world" } });
         * console.log(obj);
         * // { "foo.bar": "hello", "foo.baz": "world" }
         * ```
         */
        flatKeys<T extends Record<string, any>>(
            obj: T,
            depth?: number,
            options?: { flatArrayIndices?: boolean; }
        ): OmitChildrenNodes<T> & Record<string | number | symbol, any>;
        /**
         * Returns a new record with all entries of the given record except the ones
         * that do not match the given predicate.
         * 
         * This function is effectively as
         * `Object.fromEntries(Object.entries(obj).filter(predicate))`.
         */
        filterEntries<T>(
            obj: Record<string, T>,
            predicate: (entry: [string, T]) => boolean
        ): Record<string, T>;
        /**
         * Applies the given transformer to all entries in the given record and returns
         * a new record containing the results.
         * 
         * This function is effectively as
         * `Object.fromEntries(Object.entries(obj).map(transformer))`.
         */
        mapEntries<T, O>(
            obj: Record<string, T>,
            transformer: (entry: [string, T]) => [string, O]
        ): Record<string, O>;
        /**
         * Returns a tuple of two records with the first one containing all entries of
         * the given record that match the given predicate and the second one containing
         * all that do not.
         */
        partitionEntries<T>(
            record: Record<string, T>,
            predicate: (entry: [string, T]) => boolean
        ): [Record<string, T>, Record<string, T>];
        /**
         * Composes a new record with all keys and values inverted.
         * 
         * This function is effectively as
         * `Object.fromEntries(Object.entries(record).map(([key, value]) => [value, key]))`.
         */
        invert<T extends Record<PropertyKey, PropertyKey>>(
            record: Readonly<T>,
        ): { [P in keyof T as T[P]]: P; };
    }
}

if (!Object.hasOwn) {
    Object.hasOwn = hasOwn;
}

if (!Object.hasOwnMethod) {
    Object.hasOwnMethod = hasOwnMethod;
}

Object.patch = patch;
Object.pick = pick;
Object.omit = omit;
Object.as = as;
Object.typeOf = typeOf;
Object.isValid = isValid;
Object.isPlainObject = isPlainObject;
Object.sanitize = sanitize;
Object.sortKeys = sortKeys;
Object.flatKeys = flatKeys;
Object.filterEntries = filterEntries;
Object.mapEntries = mapEntries;
Object.partitionEntries = partitionEntries;
Object.invert = invert;
