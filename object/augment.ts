import { hasOwn, hasOwnMethod, omit, patch, pick, as, isValid, isPlainObject } from "./index.ts";

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
         * NOTE: this function only collect keys from the object's own properties, except for type
         * Error, whose `name`, `message` and `cause` are always collected.
         */
        omit<T extends object, U extends keyof T>(obj: T, keys: U[]): Omit<T, U>;
        omit<T>(obj: T, keys: (string | symbol)[]): Partial<T>;
        /**
         * Checks if the value is an instance of the given type, returns the value itself if passed,
         * otherwise returns `null`. This function is mainly used for the optional chaining syntax.
         * @example
         * ```ts
         * Object.as(bar, SomeType)?.doSomething();
         * ```
         */
        as(value: unknown, type: StringConstructor): string | null;
        as(value: unknown, type: NumberConstructor): number | null;
        as(value: unknown, type: BigIntConstructor): bigint | null;
        as(value: unknown, type: BooleanConstructor): boolean | null;
        as(value: unknown, type: SymbolConstructor): symbol | null;
        as<T>(value: unknown, type: Constructor<T>): T | null;
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
Object.isValid = isValid;
Object.isPlainObject = isPlainObject;
