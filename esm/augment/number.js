import { isFloat, isNumeric, isBetween, random, range, serial, clamp } from '../number.js';

Number.isFloat = isFloat;
Number.isNumeric = isNumeric;
Number.isBetween = isBetween;
Number.random = random;
Number.range = range;
Number.serial = serial;
Number.prototype.isBetween = function (min, max) {
    return isBetween(this, min, max);
};
if (!Number.prototype.clamp) {
    Number.prototype.clamp = function (min, max) {
        return clamp(this, min, max);
    };
}
//# sourceMappingURL=number.js.map
