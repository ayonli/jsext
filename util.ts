export function isFunction(val: unknown): val is (...args: any[]) => any {
    return typeof val === "function";
}

export function unrefTimer(timer: NodeJS.Timeout | number): void {
    if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
    } else if (typeof Deno === "object" && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(timer as number);
    }
}
