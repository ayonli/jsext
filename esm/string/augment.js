import { compare, random, count, capitalize, hyphenate, bytes, chars, words, lines, chunk, truncate, trim, trimEnd, trimStart, stripEnd, stripStart, byteLength, isAscii } from './index.js';

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
String.prototype.bytes = function bytes$1() {
    return bytes(String(this));
};
String.prototype.chars = function chars$1() {
    return chars(String(this));
};
String.prototype.words = function words$1() {
    return words(String(this));
};
String.prototype.lines = function lines$1() {
    return lines(String(this));
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
String.prototype.stripEnd = function stripEnd$1(suffix) {
    return stripEnd(String(this), suffix);
};
String.prototype.stripStart = function stripStart$1(prefix) {
    return stripStart(String(this), prefix);
};
String.prototype.byteLength = function byteLength$1() {
    return byteLength(String(this));
};
String.prototype.isAscii = function isAscii$1(printableOnly = false) {
    return isAscii(String(this), printableOnly);
};
//# sourceMappingURL=augment.js.map
