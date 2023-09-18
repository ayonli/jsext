class Exception extends Error {
    constructor(message, options = 0) {
        super(message);
        this.code = 0;
        Object.defineProperty(this, "name", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: this.constructor.name,
        });
        if (typeof options === "number") {
            this.code = options;
        }
        else {
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

export { Exception as default };
//# sourceMappingURL=Exception.js.map
