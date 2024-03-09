/**
 * Functions for dealing with strings.
 * @module
 */

import { chunk as _chunk } from "../array/base.ts";

const encoder = new TextEncoder();
const _chars = chars;

/**
 * Compares two strings, returns `-1` if `a < b`, `0` if `a == b` and `1` if `a > b`.
 */
export function compare(str1: string, str2: string): -1 | 0 | 1 {
    if (str1 < str2) {
        return -1;
    } else if (str1 > str2) {
        return 1;
    } else {
        return 0;
    }
}

/**
 * Returns a random string restricted by `length` (character-wise).
 * 
 * @param chars Default value: `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`.
 */
export function random(
    length: number,
    chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
): string {
    const arr = _chars(chars);
    let str = "";

    while (0 < length--) {
        const i = Math.floor(Math.random() * arr.length);
        str += arr[i];
    }

    return str;
}

/** Counts the occurrence of the sub-string in the string. */
export function count(str: string, sub: string): number {
    if (!sub) {
        return str.length + 1;
    } else if (!str) {
        return 0;
    }

    return str.split(sub).length - 1;
}

/**
 * Capitalizes the string, if `all` is true, all words are capitalized, otherwise only
 * the first word will be capitalized.
 */
export function capitalize(str: string, all?: boolean): string {
    const regex = all ? /\w+/g : /\w+/;
    return str.replace(regex, (match) => {
        return (match[0] as string).toUpperCase() + match.slice(1).toLowerCase();
    });
}

/** Replaces the spaces between non-empty characters of the string with hyphens (`-`). */
export function hyphenate(str: string): string {
    return str.replace(/(\S)\s+(\S)/g, (_, $1, $2) => $1 + "-" + $2);
}

/** Returns the bytes of the given string. */
export function bytes(str: string): Uint8Array {
    return encoder.encode(str);
}

/** Returns the characters of the string (emojis are supported). */
export function chars(str: string): string[] {
    if (typeof (Intl as any)?.Segmenter === "function") {
        return Array.from(new (Intl as any).Segmenter().segment(str))
            .map((x: any) => x.segment);
    } else {
        return Array.from(str);
    }
}

/** Extracts words (in latin characters) from the string. */
export function words(str: string): string[] {
    const matches = str.match(/\w+/g);
    return matches ? [...matches].map(sub => sub.split("_")).flat() : [];
}

/** Splits the string into lines by `\n` or `\r\n`. */
export function lines(str: string): string[] {
    return str.split(/\r?\n/);
}

/** Breaks the string into smaller chunks according to the given length. */
export function chunk(str: string, length: number): string[] {
    return _chunk(str, length) as string[];
}

/** Truncates the string to the given length (including the ending `...`). */
export function truncate(str: string, length: number): string {
    if (length <= 0) {
        return "";
    } else if (length >= str.length) {
        return str;
    } else {
        length -= 3;
        return str.slice(0, length) + "...";
    }
}

const _trim = String.prototype.trim;
const _trimEnd = String.prototype.trimEnd;
const _trimStart = String.prototype.trimStart;

/** Removes leading and trailing spaces or custom characters of the string. */
export function trim(str: string, chars = ""): string {
    if (!chars) {
        return _trim.call(str);
    } else {
        return trimEnd(trimStart(str, chars), chars);
    }
}

/** Removes trailing spaces or custom characters of the string. */
export function trimEnd(str: string, chars = ""): string {
    if (!chars) {
        return _trimEnd.call(str);
    } else {
        let i = str.length;
        while (i-- && chars.indexOf(str[i] as string) !== -1) { }
        return str.substring(0, i + 1);
    }
}

/** Removes leading spaces or custom characters of the string. */
export function trimStart(str: string, chars = ""): string {
    if (!chars) {
        return _trimStart.call(str);
    } else {
        let i = 0;
        do { } while (chars.indexOf(str[i] as string) !== -1 && ++i);
        return str.substring(i);
    }
}

/** Removes the given suffix of the string if present. */
export function stripEnd(str: string, suffix: string): string {
    if (str.endsWith(suffix)) {
        return str.slice(0, -suffix.length);
    }

    return str;
}

/** Removes the given prefix of the string if present. */
export function stripStart(str: string, prefix: string): string {
    if (str.startsWith(prefix)) {
        return str.slice(prefix.length);
    }

    return str;
}

/** Returns the byte length of the string. */
export function byteLength(str: string): number {
    return bytes(str).byteLength;
}

/** Checks if all characters in this string are within the ASCII range. */
export function isAscii(str: string, printableOnly = false): boolean {
    return printableOnly ? /^[-~]+$/.test(str) : /^[\x00-\x7E]+$/.test(str);
}
