import Exception from "./Exception";
export { Exception };
/** Transform the error to a plain object. */
export declare function toObject<T extends Error>(err: T): {
    [x: string | symbol]: any;
};
/** Reverse a plain object to a specific error type according to the `name` property. */
export declare function fromObject<T extends {
    name: "Error";
}>(obj: T): Error;
export declare function fromObject<T extends {
    name: "EvalError";
}>(obj: T): EvalError;
export declare function fromObject<T extends {
    name: "RangeError";
}>(obj: T): RangeError;
export declare function fromObject<T extends {
    name: "ReferenceError";
}>(obj: T): ReferenceError;
export declare function fromObject<T extends {
    name: "SyntaxError";
}>(obj: T): SyntaxError;
export declare function fromObject<T extends {
    name: "TypeError";
}>(obj: T): TypeError;
export declare function fromObject<T extends {
    name: "URIError";
}>(obj: T): URIError;
export declare function fromObject<T extends {
    name: "Exception";
}>(obj: T): Exception;
export declare function fromObject<T extends Error>(obj: {
    [x: string | symbol]: any;
}): T;
