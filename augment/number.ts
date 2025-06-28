import { clamp, isBetween, isFloat, isNumeric, random, range, serial } from "../number.ts";

declare global {
    interface NumberConstructor {
        /** Returns `true` if the given value is a float, `false` otherwise. */
        isFloat(value: unknown): boolean;
        /**
         * Returns `true` if the given value is a numeric value, `false` otherwise. A numeric value
         * is a number, a bigint, or a string that can be converted as a number or bigint.
         * 
         * **NOTE:** `NaN` is not considered numeric.
         * 
         * @param strict Only returns `true` when the value is of type `number`.
         */
        isNumeric(value: unknown, strict?: boolean): boolean;
        /**
         * @deprecated use `value.isBetween(min, max)` instead.  
         */
        isBetween(value: number, [min, max]: [number, number]): boolean;
        /** Returns a random integer ranged from `min` to `max` (inclusive). */
        random(min: number, max: number): number;
        /** Generates a sequence of numbers from `min` to `max` (inclusive). */
        range(min: number, max: number, step?: number): Generator<number, void, unknown>;
        /**
         * Creates a generator that produces sequential numbers from `1` to
         * `Number.MAX_SAFE_INTEGER`, useful for generating unique IDs.
         * 
         * @param loop Repeat the sequence when the end is reached.
         */
        serial(loop?: boolean): Generator<number, void, unknown>;
    }

    interface Number {
        /**
         * Return `true` if a number is between the given range (inclusive).
         * 
         * This function is the same as `value >= min && value <= max`.
         */
        isBetween(min: number, max: number): boolean;

        /**
         * Clamps a number to be within the specified range.
         * 
         * If the number is less than `min`, it returns `min`. If the number is greater than `max`,
         * it returns `max`. Otherwise, it returns the original number.
         */
        clamp(min: number, max: number): number;
    }
}

Number.isFloat = isFloat;
Number.isNumeric = isNumeric;
Number.isBetween = isBetween;
Number.random = random;
Number.range = range;
Number.serial = serial;

Number.prototype.isBetween = function (this: number, min: number, max: number): boolean {
    return isBetween(this, min, max);
};

if (!Number.prototype.clamp) {
    Number.prototype.clamp = function (this: number, min: number, max: number): number {
        return clamp(this, min, max);
    };
}
