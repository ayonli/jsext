export { };

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

String.compare = function (str1, str2) {
    if (str1 < str2) {
        return -1;
    } else if (str1 > str2) {
        return 1;
    } else {
        return 0;
    }
};

String.random = function (length) {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let str = "";

    while (0 < length--) {
        const i = Math.floor(Math.random() * chars.length);
        str += chars[i];
    }

    return str;
};

String.prototype.count = function (sub) {
    if (!sub) {
        return this.length + 1;
    } else if (!this) {
        return 0;
    }

    return this.split(sub).length - 1;
};

String.prototype.capitalize = function (all) {
    const regex = all ? /\w+/g : /\w+/;
    return this.replace(regex, (str) => {
        return (str[0] as string).toUpperCase() + str.slice(1).toLowerCase();
    });
};

String.prototype.hyphenate = function () {
    return this.replace(/(\S)\s+(\S)/g, (_, $1, $2) => $1 + "-" + $2);
};

String.prototype.words = function words() {
    const matches = this.match(/\w+/g);
    return matches ? [...matches] : [];
};

String.prototype.chunk = function (length) {
    const limit = this.length;
    const size = Math.ceil(limit / length);
    const chunks = new Array(size);
    let offset = 0;
    let idx = 0;

    while (offset < limit) {
        chunks[idx] = this.slice(offset, offset + length);
        offset += length;
        idx++;
    }

    return chunks;
};

String.prototype.truncate = function (length) {
    if (length <= 0) {
        return "";
    } else if (length >= this.length) {
        return String(this);
    } else {
        length -= 3;
        return this.slice(0, length) + "...";
    }
};

const encoder = new TextEncoder();
String.prototype.byteLength = function () {
    return encoder.encode(String(this)).byteLength;
};
