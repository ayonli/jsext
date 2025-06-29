/**
 * Functions for dealing with numbers.
 * @module
 */
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
 * **NOTE:** `NaN` is not considered numeric.
 *
 * @param strict Only returns `true` when the value is of type `number`.
 *
 * @example
 * ```ts
 * import { isNumeric } from "@ayonli/jsext/number";
 *
 * console.log(isNumeric(42)); // true
 * console.log(isNumeric(42n)); // true
 * console.log(isNumeric("42")); // true
 *
 * console.log(isNumeric(NaN)); // false
 * console.log(isNumeric(42n, true)); // false
 * console.log(isNumeric("42", true)); // false
 * ```
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
function isBetween(value, arg1, arg2 = undefined) {
    const min = Array.isArray(arg1) ? arg1[0] : arg1;
    const max = Array.isArray(arg1) ? arg1[1] : arg2;
    if (min > max) {
        throw new RangeError("Minimum value cannot be greater than maximum value.");
    }
    return value >= min && value <= max;
}
/**
 * Clamps a number to be within the specified range.
 *
 * If the number is less than `min`, it returns `min`. If the number is greater than `max`,
 * it returns `max`. Otherwise, it returns the original number.
 */
function clamp(value, min, max) {
    if (min > max) {
        throw new RangeError("Minimum value cannot be greater than maximum value.");
    }
    return Math.max(min, Math.min(max, value));
}
/**
 * Returns a random integer ranged from `min` to `max` (inclusive).
 *
 * @example
 * ```ts
 * import { random } from "@ayonli/jsext/number";
 *
 * console.log(random(1, 5)); // 1, 2, 3, 4, or 5
 * ```
 */
function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
/**
 * Generates a sequence of numbers from `min` to `max` (inclusive).
 *
 * @example
 * ```ts
 * import { range } from "@ayonli/jsext/number";
 *
 * for (const i of range(1, 5)) {
 *     console.log(i);
 * }
 * // output:
 * // 1
 * // 2
 * // 3
 * // 4
 * // 5
 * ```
 */
function range(min, max, step = 1) {
    return sequence(min, max, step);
}
/**
 * Creates a generator that produces sequential numbers from `1` to
 * `Number.MAX_SAFE_INTEGER`, useful for generating unique IDs.
 *
 * @param loop Repeat the sequence when the end is reached.
 *
 * @example
 * ```ts
 * import { serial } from "@ayonli/jsext/number";
 *
 * const idGenerator = serial();
 *
 * console.log(idGenerator.next().value); // 1
 * console.log(idGenerator.next().value); // 2
 * console.log(idGenerator.next().value); // 3
 * ```
 */
function serial(loop = false) {
    return sequence(1, Number.MAX_SAFE_INTEGER, 1, loop);
}
/**
 * Creates a generator that produces sequential numbers from `min` to `max` (inclusive).
 * @inner
 */
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

export { clamp, isBetween, isFloat, isNumeric, random, range, serial };
//# sourceMappingURL=number.js.map
