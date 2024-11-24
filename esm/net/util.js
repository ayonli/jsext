function constructNetAddress(addr) {
    Object.defineProperty(addr, "address", {
        enumerable: false,
        get() {
            return this.hostname;
        },
    });
    return addr;
}

export { constructNetAddress };
//# sourceMappingURL=util.js.map
