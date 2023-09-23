import { chunk as chunk$1 } from '../array/index.js';

/**
 * Compares two strings, returns `-1` if `a < b`, `0` if `a == b` and `1` if `a > b`.
 */
function compare(str1, str2) {
    if (str1 < str2) {
        return -1;
    }
    else if (str1 > str2) {
        return 1;
    }
    else {
        return 0;
    }
}
/** Returns a random string, the charset matches `/[0-9a-zA-Z]/`. */
function random(length) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let str = "";
    while (0 < length--) {
        const i = Math.floor(Math.random() * chars.length);
        str += chars[i];
    }
    return str;
}
/** Counts the occurrence of the sub-string in the string. */
function count(str, sub) {
    if (!sub) {
        return str.length + 1;
    }
    else if (!str) {
        return 0;
    }
    return str.split(sub).length - 1;
}
/**
 * Capitalizes the string, if `all` is true, all words are capitalized, otherwise only
 * the first word will be capitalized.
 */
function capitalize(str, all) {
    const regex = all ? /\w+/g : /\w+/;
    return str.replace(regex, (match) => {
        return match[0].toUpperCase() + match.slice(1).toLowerCase();
    });
}
/** Replaces the spaces between non-empty characters of the string with hyphens (`-`). */
function hyphenate(str) {
    return str.replace(/(\S)\s+(\S)/g, (_, $1, $2) => $1 + "-" + $2);
}
/** Extracts words (in latin characters) from the string. */
function words(str) {
    const matches = str.match(/\w+/g);
    return matches ? [...matches] : [];
}
/** Breaks the string into smaller chunks according to the given length. */
function chunk(str, length) {
    return chunk$1(str, length);
}
/** Truncates the string to the given length (including the ending `...`). */
function truncate(str, length) {
    if (length <= 0) {
        return "";
    }
    else if (length >= str.length) {
        return str;
    }
    else {
        length -= 3;
        return str.slice(0, length) + "...";
    }
}
const encoder = new TextEncoder();
/** Returns the byte length of the string. */
function byteLength(str) {
    return encoder.encode(str).byteLength;
}

export { byteLength, capitalize, chunk, compare, count, hyphenate, random, truncate, words };
//# sourceMappingURL=index.js.map
