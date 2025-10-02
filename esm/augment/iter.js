import { concat, filterMap, inspect, stepBy, chunk, enumerate, zip } from '../iter.js';

Iterator.prototype.concat = function concat$1(...others) {
    return concat(this, ...others);
};
Iterator.prototype.filterMap = function filterMap$1(fn) {
    return filterMap(this, fn);
};
Iterator.prototype.inspect = function inspect$1(fn) {
    return inspect(this, fn);
};
Iterator.prototype.stepBy = function stepBy$1(step) {
    return stepBy(this, step);
};
Iterator.prototype.chunk = function chunk$1(size) {
    return chunk(this, size);
};
Iterator.prototype.enumerate = function enumerate$1() {
    return enumerate(this);
};
Iterator.prototype.zip = function zip$1(other) {
    return zip(this, other);
};
//# sourceMappingURL=iter.js.map
