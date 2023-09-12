/** Returns true if the given value is a float, false otherwise. */
export function isFloat(value: unknown): boolean {
    return typeof value === "number" && (!Number.isFinite(value) || (value as number) % 1 !== 0);
}

/** Returns a random integer ranged from `min` to `max`. */
export function random(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}
