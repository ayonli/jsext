const _impl = Symbol.for("impl");
class Socket {
    constructor(impl) {
        this[_impl] = impl;
    }
    get localAddress() {
        var _a;
        return (_a = this[_impl].localAddress) !== null && _a !== void 0 ? _a : null;
    }
    get remoteAddress() {
        var _a;
        return (_a = this[_impl].remoteAddress) !== null && _a !== void 0 ? _a : null;
    }
    get readable() {
        return this[_impl].readable;
    }
    get writable() {
        return this[_impl].writable;
    }
    get closed() {
        return this[_impl].closed;
    }
    close() {
        return this[_impl].close();
    }
    startTls() {
        return this[_impl].startTls();
    }
    ref() {
        return this[_impl].ref();
    }
    unref() {
        return this[_impl].unref();
    }
}

export { Socket };
//# sourceMappingURL=types.js.map
