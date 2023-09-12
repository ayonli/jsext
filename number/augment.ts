import { isFloat, random } from ".";

declare global {
    interface NumberConstructor {
        /** Returns true if the given value is a float, false otherwise. */
        isFloat(value: unknown): boolean;
        /** Returns a random integer ranged from `min` to `max`. */
        random(min: number, max: number): number;
    }
}

Number.isFloat = isFloat;
Number.random = random;
