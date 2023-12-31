/** Returns `true` if the given value is a float number, `false` otherwise. */
export function isFloat(value: unknown): boolean {
    return typeof value === "number"
        && !Number.isNaN(value)
        && (!Number.isFinite(value) || (value as number) % 1 !== 0);
}

/**
 * Returns `true` if the given value is a numeric value, `false` otherwise. A numeric value is a 
 * number, a bigint, or a string that can be converted to a number or bigint.
 */
export function isNumeric(value: unknown): boolean {
    const type = typeof value;

    if (type === "number" || type === "bigint") {
        return true;
    } else if (type === "string") {
        if (!Number.isNaN(value)) {
            return true;
        } else {
            try {
                BigInt(value as string);
                return true;
            } catch {
                return false;
            }
        }
    }

    return false;
}

/** Return `true` if a number is between the given range (inclusive). */
export function isBetween(value: number, [min, max]: [number, number]): boolean {
    return value >= min && value <= max;
}

/** Returns a random integer ranged from `min` to `max` (inclusive). */
export function random(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

/** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
export function* sequence(min: number, max: number, step = 1, loop = false) {
    let id = min;

    while (true) {
        yield id;

        if ((id += step) > max) {
            if (loop) {
                id = min;
            } else {
                break;
            }
        }
    }
}
