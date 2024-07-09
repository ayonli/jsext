if (typeof globalThis.Event !== "function") {
    // @ts-ignore
    globalThis.Event = class Event {
        constructor(public type: string, public eventInitDict: EventInit = {}) {
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

        bubbles = false;
        cancelable = false;
        composed = false;
        currentTarget: EventTarget | null = null;
        defaultPrevented = false;
        target: EventTarget | null = null;
        timeStamp = Date.now();
        isTrusted = false;

        composedPath(): EventTarget[] {
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
        private listeners: {
            [type: string]: { callback: (event: Event) => void, once: boolean; }[];
        } = {};

        addEventListener<T extends Event>(
            type: string,
            callback: (event: T) => void,
            options: { once?: boolean; } = {}
        ) {
            if (!(type in this.listeners)) {
                this.listeners[type] = [];
            }

            // @ts-ignore
            this.listeners[type].push({ callback, once: options?.once ?? false });
        }

        removeEventListener<T extends Event>(type: string, callback: (event: T) => void) {
            if (!(type in this.listeners)) {
                return;
            }

            const stack = this.listeners[type]!;
            for (let i = 0, l = stack.length; i < l; i++) {
                if (stack[i]!.callback === callback) {
                    stack.splice(i, 1);
                    return;
                }
            }

            if (stack.length === 0) {
                delete this.listeners[type];
            }
        }

        dispatchEvent<T extends Event>(event: T): boolean {
            if (!(event.type in this.listeners)) {
                return true;
            }

            const stack = this.listeners[event.type]!.slice();
            for (let i = 0, l = stack.length; i < l; i++) {
                const listener = stack[i]!;

                try {
                    listener.callback.call(this, event);
                } catch (err) {
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
