import { omit } from "../object";
import Exception from "./Exception";

export { Exception };

/** Transform the error to a plain object. */
export function toObject<T extends Error>(err: T): { [x: string | symbol]: any; } {
    return omit(err, []);
}

/** Reverse a plain object to a specific error type according to the `name` property. */
export function fromObject<T extends { name: "Error"; }>(obj: T): Error;
export function fromObject<T extends { name: "EvalError"; }>(obj: T): EvalError;
export function fromObject<T extends { name: "RangeError"; }>(obj: T): RangeError;
export function fromObject<T extends { name: "ReferenceError"; }>(obj: T): ReferenceError;
export function fromObject<T extends { name: "SyntaxError"; }>(obj: T): SyntaxError;
export function fromObject<T extends { name: "TypeError"; }>(obj: T): TypeError;
export function fromObject<T extends { name: "URIError"; }>(obj: T): URIError;
export function fromObject<T extends { name: "Exception"; }>(obj: T): Exception;
export function fromObject<T extends Error>(obj: { [x: string | symbol]: any; }): T;
export function fromObject<T extends Error>(obj: { [x: string | symbol]: any; }): T {
    // @ts-ignore
    let ctor = globalThis[obj.name] as new (...args: any) => T;

    if (!ctor) {
        if (obj["name"] === "Exception") {
            ctor = Exception as unknown as new (...args: any) => T;
        } else {
            ctor = Error as unknown as new (...args: any) => T;
        }
    }

    const err: T = Object.create(ctor.prototype, {
        message: {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["message"] ?? "",
        },
    });

    if (err.name !== obj["name"]) {
        Object.defineProperty(err, "name", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["name"],
        });
    }

    if (obj["stack"] !== undefined) {
        Object.defineProperty(err, "stack", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["stack"],
        });
    }

    if (obj["cause"] != undefined) {
        Object.defineProperty(err, "cause", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: obj["cause"],
        });
    }

    const otherKeys = Reflect.ownKeys(obj).filter(
        key => !(["name", "message", "stack", "cause"] as (string | symbol)[]).includes(key)
    );

    otherKeys.forEach(key => {
        // @ts-ignore
        err[key] = obj[key];
    });

    return err;
}
