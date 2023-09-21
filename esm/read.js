import chan from './chan.js';
import { isFunction } from './try.js';

function read(source, eventMap = undefined) {
    var _a;
    if (isFunction(source[Symbol.asyncIterator])) {
        return source;
    }
    const channel = chan(Infinity);
    const handleMessage = channel.push.bind(channel);
    const handleClose = channel.close.bind(channel);
    const handleBrowserErrorEvent = (ev) => {
        let err;
        if (ev instanceof ErrorEvent) {
            err = ev.error || new Error(ev.message);
        }
        else {
            // @ts-ignore
            err = new Error("something went wrong", { cause: ev });
        }
        handleClose(err);
    };
    const proto = Object.getPrototypeOf(source);
    const msgDesc = Object.getOwnPropertyDescriptor(proto, "onmessage");
    if ((msgDesc === null || msgDesc === void 0 ? void 0 : msgDesc.set) && isFunction(source["close"])) { // WebSocket or EventSource
        const errDesc = Object.getOwnPropertyDescriptor(proto, "onerror");
        const closeDesc = Object.getOwnPropertyDescriptor(proto, "onclose");
        let cleanup;
        if ((eventMap === null || eventMap === void 0 ? void 0 : eventMap.event) &&
            (eventMap === null || eventMap === void 0 ? void 0 : eventMap.event) !== "message" &&
            isFunction(source["addEventListener"])) { // for EventSource listening on custom events
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
        else if (!(closeDesc === null || closeDesc === void 0 ? void 0 : closeDesc.set) && isFunction(source["close"])) { // EventSource
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
    else if (isFunction(source["send"]) && isFunction(source["close"])) {
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
    else if (isFunction(source["addEventListener"])) { // EventTarget
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
    else if (isFunction(source["on"])) { // EventEmitter
        const target = source;
        let dataEvent;
        let errEvent;
        let closeEvent;
        if (typeof process === "object" && source === process) {
            dataEvent = "message";
            errEvent = "uncaughtException";
            closeEvent = "exit";
        }
        else if ((isFunction(source["send"]) && isFunction(source["kill"])) || // child process
            (isFunction(source["postMessage"]) && isFunction(source["terminate"])) || // worker thread
            (isFunction(source["postMessage"]) && isFunction(source["close"])) // message port
        ) {
            dataEvent = "message";
            errEvent = "error";
            closeEvent = "exit";
        }
        else {
            dataEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.data) || "data";
            errEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.error) || "error";
            closeEvent = (eventMap === null || eventMap === void 0 ? void 0 : eventMap.close) || "close";
        }
        target.on(dataEvent, handleMessage);
        target.once(errEvent, handleClose);
        target.once(closeEvent, () => {
            handleClose();
            target.off(dataEvent, handleMessage);
            target.off(errEvent, handleClose);
        });
    }
    else {
        throw new TypeError("the input source cannot be read as an AsyncIterable object");
    }
    return {
        [Symbol.asyncIterator]: channel[Symbol.asyncIterator].bind(channel),
    };
}

export { read as default };
//# sourceMappingURL=read.js.map
