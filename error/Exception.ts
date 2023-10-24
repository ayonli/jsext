export default class Exception extends Error {
    cause?: unknown;
    code: number = 0;

    constructor(message: string, name?: string);
    constructor(message: string, code?: number);
    constructor(message: string, options: { name?: string; cause?: unknown; code?: number; });
    constructor(message: string, options: number | string | { name?: string; cause?: unknown; code?: number; } = 0) {
        super(message);

        if (typeof options === "number") {
            this.code = options;
        } else if (typeof options === "string") {
            Object.defineProperty(this, "name", {
                configurable: true,
                enumerable: false,
                writable: true,
                value: options,
            });
        } else {
            if (options.name) {
                Object.defineProperty(this, "name", {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: options.name,
                });
            }

            if (options.cause) {
                Object.defineProperty(this, "cause", {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: options.cause,
                });
            }

            if (options.code) {
                this.code = options.code;
            }
        }
    }
}

Object.defineProperty(Exception.prototype, "name", {
    configurable: true,
    enumerable: false,
    writable: true,
    value: "Exception",
});
