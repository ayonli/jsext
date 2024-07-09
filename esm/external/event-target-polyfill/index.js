if (typeof globalThis.Event !== "function") {
    // @ts-ignore
    globalThis.Event = class Event {
        constructor(type, eventInitDict = {}) {
            this.type = type;
            this.eventInitDict = eventInitDict;
            this.bubbles = false;
            this.cancelable = false;
            this.composed = false;
            this.currentTarget = null;
            this.defaultPrevented = false;
            this.target = null;
            this.timeStamp = Date.now();
            this.isTrusted = false;
            if (eventInitDict.bubbles !== undefined) {
                this.bubbles = eventInitDict.bubbles;
            }
            if (eventInitDict.cancelable !== undefined) {
                this.cancelable = eventInitDict.cancelable;
            }
            if (eventInitDict.composed !== undefined) {
                this.composed = eventInitDict.composed;
            }
        }
        composedPath() {
            return [];
        }
        preventDefault() {
            this.defaultPrevented = true;
        }
        stopImmediatePropagation() {
            // Do nothing
        }
        stopPropagation() {
            // Do nothing
        }
    };
}
if (typeof globalThis.EventTarget !== "function") {
    // @ts-ignore
    globalThis.EventTarget = class EventTarget {
        constructor() {
            this.listeners = {};
        }
        addEventListener(type, callback, options = {}) {
            var _a;
            if (!(type in this.listeners)) {
                this.listeners[type] = [];
            }
            // @ts-ignore
            this.listeners[type].push({ callback, once: (_a = options === null || options === void 0 ? void 0 : options.once) !== null && _a !== void 0 ? _a : false });
        }
        removeEventListener(type, callback) {
            if (!(type in this.listeners)) {
                return;
            }
            const stack = this.listeners[type];
            for (let i = 0, l = stack.length; i < l; i++) {
                if (stack[i].callback === callback) {
                    stack.splice(i, 1);
                    return;
                }
            }
            if (stack.length === 0) {
                delete this.listeners[type];
            }
        }
        dispatchEvent(event) {
            if (!(event.type in this.listeners)) {
                return true;
            }
            const stack = this.listeners[event.type].slice();
            for (let i = 0, l = stack.length; i < l; i++) {
                const listener = stack[i];
                try {
                    listener.callback.call(this, event);
                }
                catch (err) {
                    setTimeout(() => {
                        throw err;
                    });
                }
                if (listener.once) {
                    this.removeEventListener(event.type, listener.callback);
                }
            }
            return !event.defaultPrevented;
        }
    };
}
//# sourceMappingURL=index.js.map
