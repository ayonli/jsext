import { Constructor } from "../index.ts";
import { omit } from "../object/index.ts";
import Exception from "./Exception.ts";

export { Exception };

/** Transform the error to a plain object. */
export function toObject<T extends Error>(err: T): { [x: string | symbol]: any; } {
    if (!(err instanceof Error) && err["name"] && err["message"]) { // Error-like
        err = fromObject(err, Error) as any;
    }

    return omit(err, ["toString", "toJSON"]);
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
export function fromObject<T extends Error>(obj: { [x: string | symbol]: any; }, ctor?: Constructor<Error>): T | null;
export function fromObject<T extends Error>(
    obj: { [x: string | symbol]: any; },
    ctor: Function | undefined = undefined
): T | null {
    // @ts-ignore
    if (!obj?.name) {
        return null;
    }

    // @ts-ignore
    ctor ||= globalThis[obj.name] as new (...args: any) => T;

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
