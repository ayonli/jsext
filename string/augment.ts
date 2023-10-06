import {
    compare,
    random,
    byteLength as _byteLength,
    capitalize as _capitalize,
    chunk as _chunk,
    count as _count,
    hyphenate as _hyphenate,
    truncate as _truncate,
    words as _words,
    trim as _trim,
    trimEnd as _trimEnd,
    trimStart as _trimStart
} from "./index.ts";

declare global {
    interface StringConstructor {
        /**
         * Compares two strings, returns `-1` if `a < b`, `0` if `a == b` and `1` if `a > b`.
         */
        compare(str1: string, str2: string): -1 | 0 | 1;
        /** Returns a random string, the charset matches `/[0-9a-zA-Z]/` */
        random(length: number): string;
    }

    interface String {
        /** Counts the occurrence of the sub-string in the string. */
        count(sub: string): number;
        /**
         * Capitalizes the string, if `all` is true, all words are capitalized, otherwise only
         * the first word will be capitalized.
         */
        capitalize(all?: boolean): string;
        /** Replaces the spaces between non-empty characters of the string with hyphens (`-`). */
        hyphenate(): string;
        /** Extracts words (in latin characters) from the string. */
        words(): string[];
        /** Breaks the string into smaller chunks according to the given length. */
        chunk(length: number): string[];
        /** Truncates the string to the given length (including the ending `...`). */
        truncate(length: number): string;
        /** Removes leading and trailing spaces or custom characters of the string. */
        trim(chars?: string): string;
        /** Removes trailing spaces or custom characters of the string. */
        trimEnd(chars?: string): string;
        /** Removes leading spaces or custom characters of the string. */
        trimStart(chars?: string): string;
        /** Returns the byte length of the string. */
        byteLength(): number;
    }
}

String.compare = compare;
String.random = random;

String.prototype.count = function count(sub) {
    return _count(String(this), sub);
};

String.prototype.capitalize = function capitalize(all) {
    return _capitalize(String(this), all);
};

String.prototype.hyphenate = function capitalize() {
    return _hyphenate(String(this));
};

String.prototype.words = function words() {
    return _words(String(this));
};

String.prototype.chunk = function chunk(length) {
    return _chunk(String(this), length);
};

String.prototype.truncate = function truncate(length) {
    return _truncate(String(this), length);
};

String.prototype.trim = function trim(chars: string = "") {
    return _trim(String(this), chars);
};

String.prototype.trimEnd = function trimEnd(chars: string = "") {
    return _trimEnd(String(this), chars);
};

String.prototype.trimStart = function trimStart(chars: string = "") {
    return _trimStart(String(this), chars);
};

String.prototype.byteLength = function byteLength() {
    return _byteLength(String(this));
};
