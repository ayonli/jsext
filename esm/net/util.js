function constructNetAddress(addr) {
    Object.assign(addr, {
        family: addr.hostname.includes(":") ? "IPv6" : "IPv4",
    });
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
