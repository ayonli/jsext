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
         * Returns the object if it's an instance of the given type, otherwise returns `null`.
         * This function is mainly used for the optional chaining syntax.
         * @example
         *  Object.as(bar, SomeType)?.doSomething();
         */
        as(obj: any, type: StringConstructor): string | null;
        as(obj: any, type: NumberConstructor): number | null;
        as(obj: any, type: BigIntConstructor): bigint | null;
        as(obj: any, type: BooleanConstructor): boolean | null;
        as(obj: any, type: SymbolConstructor): symbol | null;
        as<T>(obj: any, type: Constructor<T>): T | null;
    }
}
export {};