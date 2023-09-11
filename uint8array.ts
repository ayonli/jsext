export { };

declare global {
    interface Uint8ArrayConstructor {
        /** Like `Buffer.compare` but for pure `Uint8Array`. */
        compare(arr1: Uint8Array, arr2: Uint8Array): -1 | 0 | 1;
    }

    interface Uint8Array {
        /**
         * Compare this array to another array and see if it contains the same elements as
         * this array.
         */
        equals(another: Uint8Array): boolean;
        /** Breaks the array into smaller chunks according to the given delimiter. */
        split(delimiter: number): this[];
        /** Breaks the array into smaller chunks according to the given length. */
        chunk(length: number): this[];
    }
}

Uint8Array.compare = function (arr1, arr2) {
    if (arr1 === arr2) {
        return 0;
    }

    for (let i = 0; i < arr1.length; i++) {
        const ele1 = arr1[i] as number;
        const ele2 = arr2[i];

        if (ele2 === undefined) {
            return 1;
        } else if (ele1 < ele2) {
            return -1;
        } else if (ele1 > ele2) {
            return 1;
        }
    }

    return arr1.length < arr2.length ? -1 : 0;
};

Uint8Array.prototype.equals = function (another) {
    if (this.length !== another.length || !(another instanceof Uint8Array)) {
        return false;
    }

    for (let i = 0; i < this.length; i++) {
        if (this[i] !== another[i]) {
            return false;
        }
    }

    return true;
};

Uint8Array.prototype.split = function (delimiter) {
    const chunks: (typeof this)[] = [];
    const limit = this.length;
    let offset = 0;

    for (let i = 0; i < limit; i++) {
        if (this[i] === delimiter) {
            chunks.push(this.slice(offset, i));
            offset = i + 1;
        }
    }

    if (offset < limit) {
        chunks.push(this.slice(offset, limit));
    } else if (offset === limit) {
        chunks.push((this.constructor as typeof Uint8Array).from([]));
    }

    return chunks;
};

Uint8Array.prototype.chunk = function (length) {
    const limit = this.length;
    const size = Math.ceil(limit / length);
    const chunks = new Array<typeof this>(size);
    let offset = 0;
    let idx = 0;

    while (offset < limit) {
        chunks[idx] = this.slice(offset, offset + length);
        offset += length;
        idx++;
    }

    return chunks;
};
