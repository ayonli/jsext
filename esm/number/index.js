/** Returns true if the given value is a float, false otherwise. */
function isFloat(value) {
    return typeof value === "number"
        && !Number.isNaN(value)
        && (!Number.isFinite(value) || value % 1 !== 0);
}
/** Returns a random integer ranged from `min` to `max`. */
function random(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
/** Creates a generator that produces sequential numbers from `min` to `max` (inclusive). */
function* sequence(min, max, step = 1, loop = false) {
    let id = min;
    while (true) {
        yield id;
        if (id >= max) {
            if (loop) {
                id = min;
            }
            else {
                break;
            }
        }
        else {
            id += step;
        }
    }
}

export { isFloat, random, sequence };
//# sourceMappingURL=index.js.map
