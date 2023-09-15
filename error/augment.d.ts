declare global {
    interface Error {
        toJSON(): {
            [x: string]: any;
        };
    }
    interface ErrorConstructor {
        /** Transform the error to a plain object. */
        toObject<T extends Error>(err: T): {
            [x: string | symbol]: any;
        };
        /** Reverse a plain object to a specific error type according to the `name` property. */
        fromObject<T extends {
            name: "Error";
        }>(obj: T): Error;
        fromObject<T extends {
            name: "EvalError";
        }>(obj: T): EvalError;
        fromObject<T extends {
            name: "RangeError";
        }>(obj: T): RangeError;
        fromObject<T extends {
            name: "ReferenceError";
        }>(obj: T): ReferenceError;
        fromObject<T extends {
            name: "SyntaxError";
        }>(obj: T): SyntaxError;
        fromObject<T extends {
            name: "TypeError";
        }>(obj: T): TypeError;
        fromObject<T extends {
            name: "URIError";
        }>(obj: T): URIError;
        fromObject<T extends {
            name: "Exception";
        }>(obj: T): Exception;
        fromObject<T extends Error>(obj: {
            [x: string | symbol]: any;
        }): T;
    }
    class Exception extends Error {
        readonly cause?: unknown;
        readonly code: number;
        constructor(message: string, code?: number);
        constructor(message: string, options: {
            cause?: unknown;
            code?: number;
        });
    }
}
export {};
