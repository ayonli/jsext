import { copy, concat, compare, equals, hasSubset, startsWith, endsWith, split, chunk } from '../bytes.js';

Uint8Array.copy = copy;
Uint8Array.concat = concat;
Uint8Array.compare = compare;
Uint8Array.prototype.equals = function equals$1(another) {
    return equals(this, another);
};
Uint8Array.prototype.hasSubset = function hasSubset$1(subset) {
    return hasSubset(this, subset);
};
Uint8Array.prototype.startsWith = function startsWith$1(subset) {
    return startsWith(this, subset);
};
Uint8Array.prototype.endsWith = function endsWith$1(subset) {
    return endsWith(this, subset);
};
Uint8Array.prototype.split = function split$1(delimiter) {
    return split(this, delimiter);
};
Uint8Array.prototype.chunk = function chunk$1(length) {
    return chunk(this, length);
};
//# sourceMappingURL=uint8array.js.map
