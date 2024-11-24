import { NetAddress } from "./types.ts";

export function constructNetAddress(addr: Omit<NetAddress, "address">): NetAddress {
    Object.defineProperty(addr, "address", {
        enumerable: false,
        get() {
            return this.hostname;
        },
    });

    return addr as NetAddress;
}
