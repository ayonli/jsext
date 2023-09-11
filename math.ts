export { };

declare global {
    interface Math {
        /** Returns the sum value of the given values. */
        sum(...values: number[]): number;
        /** Returns the average value of the given values. */
        avg(...values: number[]): number;
        /** Returns a the product value multiplied by the given values. */
        product(...values: number[]): number;
    }
}

Math.sum = (...values) => {
    return values.reduce((sum, value) => sum + value, 0);
};

Math.avg = (...values) => {
    return Math.sum(...values) / values.length;
};

Math.product = (...values) => {
    return values.slice(1).reduce((sum, value) => sum * value, values[0] ?? 0);
};
