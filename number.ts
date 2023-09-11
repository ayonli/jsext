export { };

declare global {
    interface NumberConstructor {
        /** Returns true if the given value is a float, false otherwise. */
        isFloat(value: unknown): boolean;
        /** Returns a random integer ranged from `min` to `max`. */
        random(min: number, max: number): number;
    }
}

Number.isFloat = function (value) {
    return typeof value === "number" && (!Number.isFinite(value) || (value as number) % 1 !== 0);
};

Number.random = function (min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
};
