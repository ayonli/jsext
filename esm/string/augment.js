import { compare, random, count, capitalize, hyphenate, words, chunk, truncate, trim, trimEnd, trimStart, byteLength } from './index.js';

String.compare = compare;
String.random = random;
String.prototype.count = function count$1(sub) {
    return count(String(this), sub);
};
String.prototype.capitalize = function capitalize$1(all) {
    return capitalize(String(this), all);
};
String.prototype.hyphenate = function capitalize() {
    return hyphenate(String(this));
};
String.prototype.words = function words$1() {
    return words(String(this));
};
String.prototype.chunk = function chunk$1(length) {
    return chunk(String(this), length);
};
String.prototype.truncate = function truncate$1(length) {
    return truncate(String(this), length);
};
String.prototype.trim = function trim$1(chars = "") {
    return trim(String(this), chars);
};
String.prototype.trimEnd = function trimEnd$1(chars = "") {
    return trimEnd(String(this), chars);
};
String.prototype.trimStart = function trimStart$1(chars = "") {
    return trimStart(String(this), chars);
};
String.prototype.byteLength = function byteLength$1() {
    return byteLength(String(this));
};
//# sourceMappingURL=augment.js.map
