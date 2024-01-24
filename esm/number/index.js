/** Returns `true` if the given value is a float number, `false` otherwise. */
function isFloat(value) {
    return typeof value === "number"
        && !Number.isNaN(value)
        && (!Number.isFinite(value) || value % 1 !== 0);
}
/**
 * Returns `true` if the given value is a numeric value, `false` otherwise. A numeric value is a
 * number, a bigint, or a string that can be converted to a number or bigint.
 *
 * NOTE: `NaN` is not considered a number.
 * @param strict Only returns `true` when the value is of type `number`.
 */
function isNumeric(value, strict = false) {
    const type = typeof value;
    if (strict) {
        return type === "number" && !Number.isNaN(value);
    }
    else if (type === "bigint") {
        return true;
    }
    else if (type === "number") {
        return !Number.isNaN(value);
    }
    else if (type === "string" && value) {
        try {
            BigInt(value);
            return true;
        }
        catch (_a) {
            return !Number.isNaN(Number(value));
        }
    }
    return false;
}
/** Return `true` if a number is between the given range (inclusive). */
function isBetween(value, [min, max]) {
    return value >= min && value <= max;
}
/** Returns a random integer ranged from `min` to `max` (inclusive). */
function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
/** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
function* sequence(min, max, step = 1, loop = false) {
    let id = min;
    while (true) {
        yield id;
        if ((id += step) > max) {
            if (loop) {
                id = min;
            }
            else {
                break;
            }
        }
    }
}

export { isBetween, isFloat, isNumeric, random, sequence };
//# sourceMappingURL=index.js.map
