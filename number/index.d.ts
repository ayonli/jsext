/** Returns true if the given value is a float, false otherwise. */
export declare function isFloat(value: unknown): boolean;
/** Returns a random integer ranged from `min` to `max`. */
export declare function random(min: number, max: number): number;
/** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
export declare function sequence(min: number, max: number, step?: number, loop?: boolean): Generator<number, void, unknown>;
