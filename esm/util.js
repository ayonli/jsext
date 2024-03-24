function isFunction(val) {
    return typeof val === "function";
}
function unrefTimer(timer) {
    if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
    }
    else if (typeof Deno === "object" && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(timer);
    }
}

export { isFunction, unrefTimer };
//# sourceMappingURL=util.js.map
