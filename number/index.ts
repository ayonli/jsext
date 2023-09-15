/** Returns true if the given value is a float, false otherwise. */
export function isFloat(value: unknown): boolean {
    return typeof value === "number"
        && !Number.isNaN(value)
        && (!Number.isFinite(value) || (value as number) % 1 !== 0);
}

/** Returns a random integer ranged from `min` to `max`. */
export function random(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

/** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
export function* sequence(min: number, max: number, step = 1, loop = false) {
    let id = min;

    while (true) {
        yield id;

        if (id >= max) {
            if (loop) {
                id = min;
            } else {
                break;
            }
        } else {
            id += step;
        }
    }
}
