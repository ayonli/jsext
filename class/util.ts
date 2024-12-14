
export function setReadonly<T>(obj: any, name: string | symbol, value: T) {
    Object.defineProperty(obj, name, {
        configurable: true,
        enumerable: false,
        writable: false,
        value,
    });
}

export function getReadonly<T>(obj: any, name: string | symbol): T | undefined {
    return Object.getOwnPropertyDescriptor(obj, name)?.value;
}

export function fixStringTag(ctor: Constructor): void {
    setReadonly(ctor.prototype, Symbol.toStringTag, ctor.name);
}
