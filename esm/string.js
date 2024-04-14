import { chunk as chunk$1 } from './array/base.js';
import bytes$1 from './bytes.js';

/**
 * Functions for dealing with strings.
 * @module
 */
const _chars = chars;
const EMOJI_RE = /^(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200d(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
/**
 * Compares two strings, returns `-1` if `a < b`, `0` if `a === b` and `1` if `a > b`.
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
/**
 * Returns a random string restricted by `length` (character-wise).
 *
 * @param chars Default value: `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`.
 */
function random(length, chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const arr = _chars(chars);
    let str = "";
    while (0 < length--) {
        const i = Math.floor(Math.random() * arr.length);
        str += arr[i];
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
/**
 * Returns the bytes of the given string.
 * @deprecated use the `bytes` module instead.
 */
function bytes(str) {
    return bytes$1(str);
}
/** Returns the characters of the string (emojis are supported). */
function chars(str) {
    if (typeof (Intl === null || Intl === void 0 ? void 0 : Intl.Segmenter) === "function") {
        return Array.from(new Intl.Segmenter().segment(str))
            .map((x) => x.segment);
    }
    else {
        return Array.from(str);
    }
}
/** Extracts words (in latin characters) from the string. */
function words(str) {
    const matches = str.match(/\w+/g);
    return matches ? [...matches].map(sub => sub.split("_")).flat() : [];
}
/** Splits the string into lines by `\n` or `\r\n`. */
function lines(str) {
    return str.split(/\r?\n/);
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
const _trim = String.prototype.trim;
const _trimEnd = String.prototype.trimEnd;
const _trimStart = String.prototype.trimStart;
/** Removes leading and trailing spaces or custom characters of the string. */
function trim(str, chars = "") {
    if (!chars) {
        return _trim.call(str);
    }
    else {
        return trimEnd(trimStart(str, chars), chars);
    }
}
/** Removes trailing spaces or custom characters of the string. */
function trimEnd(str, chars = "") {
    if (!chars) {
        return _trimEnd.call(str);
    }
    else {
        let i = str.length;
        while (i-- && chars.indexOf(str[i]) !== -1) { }
        return str.substring(0, i + 1);
    }
}
/** Removes leading spaces or custom characters of the string. */
function trimStart(str, chars = "") {
    if (!chars) {
        return _trimStart.call(str);
    }
    else {
        let i = 0;
        do { } while (chars.indexOf(str[i]) !== -1 && ++i);
        return str.substring(i);
    }
}
/** Removes the given suffix of the string if present. */
function stripEnd(str, suffix) {
    if (str.endsWith(suffix)) {
        return str.slice(0, -suffix.length);
    }
    return str;
}
/** Removes the given prefix of the string if present. */
function stripStart(str, prefix) {
    if (str.startsWith(prefix)) {
        return str.slice(prefix.length);
    }
    return str;
}
/** Returns the byte length of the string. */
function byteLength(str) {
    return bytes$1(str).byteLength;
}
/** Checks if all characters in this string are within the ASCII range. */
function isAscii(str, printableOnly = false) {
    return printableOnly ? /^[-~]+$/.test(str) : /^[\x00-\x7E]+$/.test(str);
}
/** Checks if the given character is an emoji. */
function isEmoji(char) {
    return EMOJI_RE.test(char);
}

export { EMOJI_RE, byteLength, bytes, capitalize, chars, chunk, compare, count, hyphenate, isAscii, isEmoji, lines, random, stripEnd, stripStart, trim, trimEnd, trimStart, truncate, words };
//# sourceMappingURL=string.js.map
