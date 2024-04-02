/**
 * Functions for mathematical calculations.
 * @module
 */
/** Returns the sum value of the given values. */
function sum(...values) {
    return values.reduce((sum, value) => sum + value, 0);
}
/** Returns the average value of the given values. */
function avg(...values) {
    return sum(...values) / values.length;
}
/** Returns a the product value multiplied by the given values. */
function product(...values) {
    var _a;
    return values.slice(1).reduce((sum, value) => sum * value, (_a = values[0]) !== null && _a !== void 0 ? _a : 0);
}

export { avg, product, sum };
//# sourceMappingURL=math.js.map
