/**
 * Functions for working with events.
 * @module
 */
function createErrorEvent(type, options = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (typeof ErrorEvent === "function") {
        return new ErrorEvent(type, options);
    }
    else {
        const event = new Event(type, {
            bubbles: (_a = options === null || options === void 0 ? void 0 : options.bubbles) !== null && _a !== void 0 ? _a : false,
            cancelable: (_b = options === null || options === void 0 ? void 0 : options.cancelable) !== null && _b !== void 0 ? _b : false,
            composed: (_c = options === null || options === void 0 ? void 0 : options.composed) !== null && _c !== void 0 ? _c : false,
        });
        Object.defineProperties(event, {
            message: { value: (_d = options === null || options === void 0 ? void 0 : options.message) !== null && _d !== void 0 ? _d : "" },
            filename: { value: (_e = options === null || options === void 0 ? void 0 : options.filename) !== null && _e !== void 0 ? _e : "" },
            lineno: { value: (_f = options === null || options === void 0 ? void 0 : options.lineno) !== null && _f !== void 0 ? _f : 0 },
            colno: { value: (_g = options === null || options === void 0 ? void 0 : options.colno) !== null && _g !== void 0 ? _g : 0 },
            error: { value: (_h = options === null || options === void 0 ? void 0 : options.error) !== null && _h !== void 0 ? _h : undefined },
        });
        return event;
    }
}
function createCloseEvent(type, options = {}) {
    var _a, _b, _c, _d, _e, _f;
    if (typeof CloseEvent === "function") {
        return new CloseEvent(type, options);
    }
    else {
        const event = new Event(type, {
            bubbles: (_a = options === null || options === void 0 ? void 0 : options.bubbles) !== null && _a !== void 0 ? _a : false,
            cancelable: (_b = options === null || options === void 0 ? void 0 : options.cancelable) !== null && _b !== void 0 ? _b : false,
            composed: (_c = options === null || options === void 0 ? void 0 : options.composed) !== null && _c !== void 0 ? _c : false,
        });
        Object.defineProperties(event, {
            code: { value: (_d = options.code) !== null && _d !== void 0 ? _d : 0 },
            reason: { value: (_e = options.reason) !== null && _e !== void 0 ? _e : "" },
            wasClean: { value: (_f = options.wasClean) !== null && _f !== void 0 ? _f : false },
        });
        return event;
    }
}
function createProgressEvent(type, options = {}) {
    var _a, _b, _c, _d, _e, _f;
    if (typeof ProgressEvent === "function") {
        return new ProgressEvent(type, options);
    }
    else {
        const event = new Event(type, {
            bubbles: (_a = options === null || options === void 0 ? void 0 : options.bubbles) !== null && _a !== void 0 ? _a : false,
            cancelable: (_b = options === null || options === void 0 ? void 0 : options.cancelable) !== null && _b !== void 0 ? _b : false,
            composed: (_c = options === null || options === void 0 ? void 0 : options.composed) !== null && _c !== void 0 ? _c : false,
        });
        Object.defineProperties(event, {
            lengthComputable: { value: (_d = options === null || options === void 0 ? void 0 : options.lengthComputable) !== null && _d !== void 0 ? _d : false },
            loaded: { value: (_e = options === null || options === void 0 ? void 0 : options.loaded) !== null && _e !== void 0 ? _e : 0 },
            total: { value: (_f = options === null || options === void 0 ? void 0 : options.total) !== null && _f !== void 0 ? _f : 0 },
        });
        return event;
    }
}

export { createCloseEvent, createErrorEvent, createProgressEvent };
//# sourceMappingURL=event.js.map
