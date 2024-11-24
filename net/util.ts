import { NetAddress } from "./types.ts";

export function constructNetAddress(addr: Omit<NetAddress, "family" | "address">): NetAddress {
    Object.assign(addr, {
        family: addr.hostname.includes(":") ? "IPv6" : "IPv4",
    } as Partial<NetAddress>);

    Object.defineProperty(addr, "address", {
        enumerable: false,
        get() {
            return this.hostname;
        },
    });

    return addr as NetAddress;
}
