import type { Constructor } from "../index.ts";
import { isValid } from "../object/index.ts";
import { fromObject } from "../error/index.ts";

/**
 * Converts a JSON string into an object of the given type.
 * 
 * The type can be `String`, `Number`, `BigInt`, `Boolean`, `Date`, `Array`, `Object` or any
 * class constructor (including Error types). If the class has a static
 * `fromJSON(data: any): T` method, it will be invoked to create the instance (unless the
 * parsed `data` is `null`, which will be skipped without further processing).
 * 
 * This function generally does not perform loose conversion between types, for example,
 * `parseAs('"123"', Number)` will not work, it only reverses to the same type before the
 * data are encoded.
 * 
 * However, for compatibility support, there are some exceptions allowed, which are:
 * 
 * - `string` => `Date`
 * - `number` or `string` => `bigint`
 * - `array` => `Buffer` or `TypedArray` (e.g. `Uint8Array`), when the data only contains
 *  integers.
 * - `object` => `Buffer` or `TypedArray` (e.g. `Uint8Array`), if the data are encoded by
 *  `JSON.stringify()`.
 * - customized in `fromJSON()`
 * 
 * If the data cannot be converted to the given type, this function returns `null`.
 */
export function parseAs(text: string, type: StringConstructor): string | null;
export function parseAs(text: string, type: NumberConstructor): number | null;
export function parseAs(text: string, type: BigIntConstructor): bigint | null;
export function parseAs(text: string, type: BooleanConstructor): boolean | null;
export function parseAs<T>(text: string, type: Constructor<T> & { fromJSON?(data: any): T; }): T | null;
export function parseAs<T>(
    text: string,
    type: Function & { fromJSON?(data: any): T; }
): T | null {
    const data = JSON.parse(text);

    if (data === null) {
        return null;
    } else if (typeof type.fromJSON === "function") {
        return type.fromJSON(data);
    } else if (typeof data === "boolean") {
        if (type === Boolean) {
            return data as T;
        } else {
            return null;
        }
    } else if (typeof data === "number") {
        if (type === Number) {
            return data as T;
        } else if (type === BigInt) {
            try {
                return BigInt(data) as T;
            } catch {
                return null;
            }
        } else {
            return null;
        }
    } else if (typeof data === "string") {
        if (type === String) {
            return data as T;
        } else if (type === Date) {
            const date = new Date(data);
            return isValid(date) ? date as T : null;
        } else if (type === BigInt) {
            try {
                return BigInt(data) as T;
            } catch {
                return null;
            }
        } else {
            return null;
        }
    } else if (Array.isArray(data)) {
        if (type === Array) { // Array
            return data as T;
        } else if (type.prototype instanceof Array) { // Array-derivative
            return (type as ArrayConstructor).from(data) as T;
        } else if (typeof (type.prototype as any)[Symbol.iterator] === "function" &&
            typeof (type as any)["from"] === "function"
        ) { // ArrayLike or TypedArray
            try {
                return (type as ArrayConstructor).from(data) as T;
            } catch {
                return null;
            }
        } else {
            return null;
        }
    } else if (!([String, Number, Boolean, Date, Array] as Function[]).includes(type)) {
        if (typeof Buffer === "function" &&
            type === Buffer &&
            data.type === "Buffer" &&
            Array.isArray(data.data)
        ) {
            try {
                return Buffer.from(data.data) as T;
            } catch {
                return null;
            }
        } else if (type === Uint8Array && data.type === "Buffer" && Array.isArray(data.data)) {
            try {
                // convert Node.js Buffer to Uint8Array
                return Uint8Array.from(data.data) as T;
            } catch {
                return null;
            }
        } else if (typeof (type.prototype as any)[Symbol.iterator] === "function" &&
            typeof (type as any)["from"] === "function" &&
            Object.getOwnPropertyNames(data).map(Number).every(i => !Number.isNaN(i))
        ) { // TypedArray
            try {
                return (type as ArrayConstructor).from(Object.values(data)) as T;
            } catch {
                return null;
            }
        } else if (type.prototype instanceof Error) {
            return fromObject(data) as T;
        } else {
            return Object.assign(Object.create(type.prototype as object), data) as T;
        }
    } else {
        return null;
    }
}
