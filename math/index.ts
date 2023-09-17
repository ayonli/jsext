/** Returns the sum value of the given values. */
export function sum(...values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
};

/** Returns the average value of the given values. */
export function avg(...values: number[]): number {
    return Math.sum(...values) / values.length;
};

/** Returns a the product value multiplied by the given values. */
export function product(...values: number[]): number {
    return values.slice(1).reduce((sum, value) => sum * value, values[0] ?? 0);
};
