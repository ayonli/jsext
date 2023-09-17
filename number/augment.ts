import { isBetween, isFloat, isNumeric, random, sequence } from ".";

declare global {
    interface NumberConstructor {
        /** Returns true if the given value is a float, false otherwise. */
        isFloat(value: unknown): boolean;
        /**
         * Returns `true` if the given value is a numeric value, `false` otherwise. A numeric value
         * is a number, a bigint, or a string that can be converted as a number or bigint.
         */
        isNumeric(value: unknown): boolean;
        /** Return `true` if a number is between the given range (inclusive). */
        isBetween(value: number, [min, max]: [number, number]): boolean;
        /** Returns a random integer ranged from `min` to `max` (inclusive). */
        random(min: number, max: number): number;
        /** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
        sequence(min: number, max: number, step?: number, loop?: boolean): Generator<number, void, unknown>;
    }
}

Number.isFloat = isFloat;
Number.isNumeric = isNumeric;
Number.isBetween = isBetween;
Number.random = random;
Number.sequence = sequence;
