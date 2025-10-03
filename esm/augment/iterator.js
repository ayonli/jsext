import { filterMap, dropWhile, takeWhile, stepBy, unique, uniqueBy, chunk, partition, zip, unzip, flat, concat, inspect, enumerate, nth, last, min, max, avg, sum, product } from '../iterator.js';

if (typeof Iterator === "function") {
    Iterator.prototype.filterMap = function filterMap$1(fn) {
        return filterMap(this, fn);
    };
    Iterator.prototype.dropWhile = function dropWhile$1(predicate) {
        return dropWhile(this, predicate);
    };
    Iterator.prototype.takeWhile = function takeWhile$1(predicate) {
        return takeWhile(this, predicate);
    };
    Iterator.prototype.stepBy = function stepBy$1(step) {
        return stepBy(this, step);
    };
    Iterator.prototype.unique = function unique$1() {
        return unique(this);
    };
    Iterator.prototype.uniqueBy = function uniqueBy$1(fn) {
        return uniqueBy(this, fn);
    };
    Iterator.prototype.chunk = function chunk$1(size) {
        return chunk(this, size);
    };
    Iterator.prototype.partition = function partition$1(predicate) {
        return partition(this, predicate);
    };
    Iterator.prototype.zip = function zip$1(other) {
        return zip(this, other);
    };
    Iterator.prototype.unzip = function unzip$1() {
        return unzip(this);
    };
    Iterator.prototype.flat = function flat$1() {
        return flat(this);
    };
    Iterator.prototype.concat = function concat$1(...others) {
        return concat(this, ...others);
    };
    Iterator.prototype.inspect = function inspect$1(fn) {
        return inspect(this, fn);
    };
    Iterator.prototype.enumerate = function enumerate$1() {
        return enumerate(this);
    };
    Iterator.prototype.nth = function nth$1(n) {
        return nth(this, n);
    };
    Iterator.prototype.last = function last$1() {
        return last(this);
    };
    Iterator.prototype.min = function min$1() {
        return min(this);
    };
    Iterator.prototype.max = function max$1() {
        return max(this);
    };
    Iterator.prototype.avg = function avg$1() {
        return avg(this);
    };
    Iterator.prototype.sum = function sum$1() {
        return sum(this);
    };
    Iterator.prototype.product = function product$1() {
        return product(this);
    };
}
//# sourceMappingURL=iterator.js.map
