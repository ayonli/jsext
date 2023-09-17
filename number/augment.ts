import { isFloat, random, sequence } from ".";

declare global {
    interface NumberConstructor {
        /** Returns true if the given value is a float, false otherwise. */
        isFloat(value: unknown): boolean;
        /** Returns a random integer ranged from `min` to `max` (inclusive). */
        random(min: number, max: number): number;
        /** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
        sequence(min: number, max: number, step?: number, loop?: boolean): Generator<number, void, unknown>;
    }
}

Number.isFloat = isFloat;
Number.random = random;
Number.sequence = sequence;
