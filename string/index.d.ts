/**
 * Compares two strings, returns `-1` if `a < b`, `0` if `a == b` and `1` if `a > b`.
 */
export declare function compare(str1: string, str2: string): -1 | 0 | 1;
/** Returns a random string, the charset matches `/[0-9a-zA-Z]/` */
export declare function random(length: number): string;
/** Counts the occurrence of the sub-string in the string. */
export declare function count(str: string, sub: string): number;
/**
 * Capitalizes the string, if `all` is true, all words are capitalized, otherwise only
 * the first word will be capitalized.
 */
export declare function capitalize(str: string, all?: boolean): string;
/** Replaces the spaces between non-empty characters of the string with hyphens (`-`). */
export declare function hyphenate(str: string): string;
/** Extracts words (in latin characters) from the string. */
export declare function words(str: string): string[];
/** Breaks the string into smaller chunks according to the given length. */
export declare function chunk(str: string, length: number): string[];
/** Truncates the string to the given length (including the ending `...`). */
export declare function truncate(str: string, length: number): string;
/** Returns the byte length of the string. */
export declare function byteLength(str: string): number;
