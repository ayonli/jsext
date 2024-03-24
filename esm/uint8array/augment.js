import { copy, concat, compare, equals, split, chunk } from '../bytes/index.js';

Uint8Array.copy = copy;
Uint8Array.concat = concat;
Uint8Array.compare = compare;
Uint8Array.prototype.equals = function equals$1(another) {
    return equals(this, another);
};
Uint8Array.prototype.split = function split$1(delimiter) {
    return split(this, delimiter);
};
Uint8Array.prototype.chunk = function chunk$1(length) {
    return chunk(this, length);
};
//# sourceMappingURL=augment.js.map
