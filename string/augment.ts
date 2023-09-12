import { byteLength, capitalize, chunk, compare, count, hyphenate, random, truncate, words } from ".";

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
        /** Returns the byte length of the string. */
        byteLength(): number;
    }
}

String.compare = compare;
String.random = random;

String.prototype.count = function (sub) {
    return count(String(this), sub);
};

String.prototype.capitalize = function (all) {
    return capitalize(String(this), all);
};

String.prototype.hyphenate = function () {
    return hyphenate(String(this));
};

String.prototype.words = function () {
    return words(String(this));
};

String.prototype.chunk = function (length) {
    return chunk(String(this), length);
};

String.prototype.truncate = function (length) {
    return truncate(String(this), length);
};

String.prototype.byteLength = function () {
    return byteLength(String(this));
};
