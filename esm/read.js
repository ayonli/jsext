function read(source, eventMap = undefined) {
    var _a;
    if (typeof source[Symbol.asyncIterator] === "function") {
        return source;
    }
    const iterable = {
        ended: false,
        error: null,
        queue: [],
        consumers: [],
        next() {
            return new Promise((resolve, reject) => {
                if (this.error && !this.ended) {
                    // If there is error occurred during the last transmission and the iterator
                    // hasn't been closed, reject that error and stop the iterator immediately.
                    reject(this.error);
                    this.ended = true;
                }
                else if (this.ended && !this.queue.length) {
                    // If the iterator has is closed, resolve the pending consumer with void
                    // value.
                    resolve({ value: void 0, done: true });
                }
                else if (this.queue.length > 0) {
                    // If there are data in the queue, resolve the the first piece immediately.
                    resolve({ value: this.queue.shift(), done: false });
                }
                else {
                    // If there are no queued data, push the consumer to a waiting queue.
                    this.consumers.push({ resolve, reject });
                }
            });
        }
    };
    const handleMessage = (data) => {
        var _a;
        if (iterable.consumers.length > 0) {
            (_a = iterable.consumers.shift()) === null || _a === void 0 ? void 0 : _a.resolve({ value: data, done: false });
        }
        else {
            iterable.queue.push(data);
        }
    };
    const handleClose = () => {
        iterable.ended = true;
        let consumer;
        while (consumer = iterable.consumers.shift()) {
            consumer.resolve({ value: undefined, done: true });
        }
    };
    const handleError = (err) => {
        iterable.error = err;
        if (iterable.consumers.length > 0) {
            iterable.consumers.forEach(item => {
                item.reject(err);
            });
            iterable.consumers = [];
        }
    };
    const handleBrowserErrorEvent = (ev) => {
        let err;
        if (ev instanceof ErrorEvent) {
            err = ev.error || new Error(ev.message);
        }
        else {
            // @ts-ignore
            err = new Error("something went wrong", { cause: ev });
        }
        handleError(err);
    };
    const proto = Object.getPrototypeOf(source);
    const msgDesc = Object.getOwnPropertyDescriptor(proto, "onmessage");
    if ((msgDesc === null || msgDesc === void 0 ? void 0 : msgDesc.set) && typeof source.close === "function") { // WebSocket or EventSource
        const errDesc = Object.getOwnPropertyDescriptor(proto, "onerror");
        const closeDesc = Object.getOwnPropertyDescriptor(proto, "onclose");
        let cleanup;
        if ((eventMap === null || eventMap === void 0 ? void 0 : eventMap.event) &&
            (eventMap === null || eventMap === void 0 ? void 0 : eventMap.event) !== "message" &&
            typeof source["addEventListener"] === "function") { // for EventSource listening on custom events
            const es = source;
            const eventName = eventMap.event;
            const msgListener = (ev) => {
                handleMessage(ev.data);
            };
            es.addEventListener(eventName, msgListener);
            cleanup = () => {
                es.removeEventListener(eventName, msgListener);
            };
        }
        else {
            msgDesc.set.call(source, (ev) => {
                handleMessage(ev.data);
            });
            cleanup = () => {
                var _a;
                (_a = msgDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, null);
            };
        }
        (_a = errDesc === null || errDesc === void 0 ? void 0 : errDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, handleBrowserErrorEvent);
        if (closeDesc === null || closeDesc === void 0 ? void 0 : closeDesc.set) { // WebSocket
            closeDesc.set.call(source, () => {
                var _a, _b;
                handleClose();
                (_a = closeDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, null);
                (_b = errDesc === null || errDesc === void 0 ? void 0 : errDesc.set) === null || _b === void 0 ? void 0 : _b.call(source, null);
                cleanup === null || cleanup === void 0 ? void 0 : cleanup();
            });
        }
        else if (!(closeDesc === null || closeDesc === void 0 ? void 0 : closeDesc.set) && typeof source.close === "function") { // EventSource
            // EventSource by default does not trigger close event, we need to make sure when
            // it calls the close() function, the iterator is automatically closed.
            const es = source;
            const _close = es.close;
            es.close = function close() {
                var _a;
                _close.call(es);
                handleClose();
                es.close = _close;
                (_a = errDesc === null || errDesc === void 0 ? void 0 : errDesc.set) === null || _a === void 0 ? void 0 : _a.call(source, null);
                cleanup === null || cleanup === void 0 ? void 0 : cleanup();
            };
        }
    }
    else if (typeof source.send === "function" && typeof source.close === "function") {
        // non-standard WebSocket implementation
        const ws = source;
        ws.onmessage = (ev) => {
            handleMessage(ev.data);
        };
        ws.onerror = handleBrowserErrorEvent;
        ws.onclose = () => {
            handleClose();
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
        };
    }
    else if (typeof source["addEventListener"] === "function") { // EventTarget
        const target = source;
        const msgEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.message) || "message";
        const errEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.error) || "error";
        const closeEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.close) || "close";
        const msgListener = (ev) => {
            if (ev instanceof MessageEvent) {
                handleMessage(ev.data);
            }
        };
        target.addEventListener(msgEvent, msgListener);
        target.addEventListener(errEvent, handleBrowserErrorEvent);
        target.addEventListener(closeEvent, function closeListener() {
            handleClose();
            target.removeEventListener(closeEvent, closeListener);
            target.removeEventListener(msgEvent, msgListener);
            target.removeEventListener(errEvent, handleBrowserErrorEvent);
        });
    }
    else if (typeof source["on"] === "function") { // EventEmitter
        const target = source;
        const dataEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.data) || "data";
        const errEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.error) || "error";
        const endEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.close) || "close";
        target.on(dataEvent, handleMessage);
        target.once(errEvent, handleError);
        target.once(endEvent, () => {
            handleClose();
            target.off(dataEvent, handleMessage);
            target.off(dataEvent, handleError);
        });
    }
    else {
        throw new TypeError("the input source cannot be read as an AsyncIterable object");
    }
    return {
        [Symbol.asyncIterator]() {
            return iterable;
        }
    };
}

export { read as default };
//# sourceMappingURL=read.js.map
