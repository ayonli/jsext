import { isValid } from '../object/index.js';
import { fromObject } from '../error/index.js';

const typeRegistry = new Map();
function parseAs(text, type) {
    const data = JSON.parse(text);
    return as(data, type);
}
function as(data, type) {
    if (data === null) {
        return null;
    }
    else if (typeof type.fromJSON === "function") {
        return type.fromJSON(data);
    }
    else if (typeof data === "boolean") {
        if (type === Boolean) {
            return data;
        }
        else {
            return null;
        }
    }
    else if (typeof data === "number") {
        if (type === Number) {
            return data;
        }
        else if (type === BigInt) {
            try {
                return BigInt(data);
            }
            catch (_a) {
                return null;
            }
        }
        else {
            return null;
        }
    }
    else if (typeof data === "string") {
        if (type === String) {
            return data;
        }
        else if (type === Date) {
            const date = new Date(data);
            return isValid(date) ? date : null;
        }
        else if (type === BigInt) {
            try {
                return BigInt(data);
            }
            catch (_b) {
                return null;
            }
        }
        else {
            return null;
        }
    }
    else if (Array.isArray(data)) {
        if (type === Array) { // Array
            return data;
        }
        else if (type.prototype instanceof Array) { // Array-derivative
            return type.from(data);
        }
        else if (typeof type.prototype[Symbol.iterator] === "function" &&
            typeof type["from"] === "function") { // ArrayLike or TypedArray
            try {
                return type.from(data);
            }
            catch (_c) {
                return null;
            }
        }
        else {
            return null;
        }
    }
    else if (data && ![String, Number, Boolean, Date, Array].includes(type)) {
        if (typeof Buffer === "function" &&
            type === Buffer &&
            data.type === "Buffer" &&
            Array.isArray(data.data)) {
            try {
                return Buffer.from(data.data);
            }
            catch (_d) {
                return null;
            }
        }
        else if (type === Uint8Array &&
            data.type === "Buffer" &&
            Array.isArray(data.data)) {
            try {
                // convert Node.js Buffer to Uint8Array
                return Uint8Array.from(data.data);
            }
            catch (_e) {
                return null;
            }
        }
        else if (typeof type.prototype[Symbol.iterator] === "function" &&
            typeof type["from"] === "function" &&
            Object.getOwnPropertyNames(data).map(Number).every(i => !Number.isNaN(i))) { // TypedArray
            try {
                return type.from(Object.values(data));
            }
            catch (_f) {
                return null;
            }
        }
        else if (type.prototype instanceof Error) {
            return fromObject(data);
        }
        else {
            const ins = Object.create(type.prototype);
            const typeRecords = typeRegistry.get(type.prototype);
            if (typeRecords) {
                for (const key of Reflect.ownKeys(data)) {
                    const ctor = typeRecords[key];
                    ins[key] = ctor ? as(data[key], ctor) : data[key];
                }
            }
            else {
                Object.assign(ins, data);
            }
            return ins;
        }
    }
    else {
        return null;
    }
}
/**
 * A decorator to instruct that the target property in the class is of a specific type.
 *
 * When parsing JSON via {@link parseAs}, this property is guaranteed to be of the given type.
 *
 * NOTE: this decorator only supports TypeScript's `experimentalDecorators`.
 *
 * @example
 * ```ts
 * class Example {
 *     \@type(Date)
 *     date: Date;
 * }
 * ```
 */
function type(ctor) {
    return (proto, prop) => {
        const record = typeRegistry.get(proto);
        if (record) {
            record[prop] = ctor;
        }
        else {
            typeRegistry.set(proto, { [prop]: ctor });
        }
    };
}

export { as, parseAs, type };
//# sourceMappingURL=index.js.map
