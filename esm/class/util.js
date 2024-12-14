function setReadonly(obj, name, value) {
    Object.defineProperty(obj, name, {
        configurable: true,
        enumerable: false,
        writable: false,
        value,
    });
}
function getReadonly(obj, name) {
    var _a;
    return (_a = Object.getOwnPropertyDescriptor(obj, name)) === null || _a === void 0 ? void 0 : _a.value;
}
function fixStringTag(ctor) {
    setReadonly(ctor.prototype, Symbol.toStringTag, ctor.name);
}

export { fixStringTag, getReadonly, setReadonly };
//# sourceMappingURL=util.js.map
