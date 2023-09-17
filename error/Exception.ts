export default class Exception extends Error {
    readonly cause?: unknown;
    readonly code: number = 0;

    constructor(message: string, code?: number);
    constructor(message: string, options: { cause?: unknown; code: number; });
    constructor(message: string, options: number | { cause?: unknown; code?: number; } = 0) {
        super(message);

        if (typeof options === "number") {
            this.code = options;
        } else {
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
