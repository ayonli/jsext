import { avg, product, sum } from "../math.ts";

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

Math.sum = sum;
Math.avg = avg;
Math.product = product;
