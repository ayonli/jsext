export { };

declare global {
    interface Array<T> {
        /** Returns the first element of the array, or `undefined` if the array is empty. */
        first(): T;
        /** Returns the last element of the array, or `undefined` is the array is empty. */
        last(): T;
        /** Counts the occurrence of the element in the array. */
        count(ele: T): number;
        /**
         * Performs a shallow compare to another array and see if it contains the same elements as
         * this array.
         */
        equals(another: T[]): boolean;
        /** Breaks the array into smaller chunks according to the given delimiter. */
        split(delimiter: T): T[][];
        /** Breaks the array into smaller chunks according to the given length. */
        chunk(length: number): T[][];
        /** Returns a subset of the array that contains only unique items. */
        uniq(): T[];
        /**
         * Reorganizes the elements in the array in random order.
         * 
         * This function mutate the array.
         */
        shuffle(): T[];
        toShuffled(): T[];
        toReversed(): T[];
        toSorted(fn?: ((a: T, b: T) => number) | undefined): T[];
        /**
         * Orders the items of the array according to the specified comparable `key` (whose value
         * must either be a numeric or string).
         */
        orderBy(key: keyof T, order?: "asc" | "desc"): T[];
        /**
         * Groups the items of the array according to the comparable values returned by a provided
         * callback function.
         * The returned record / map has separate properties for each group, containing arrays with
         * the items in the group.
         */
        groupBy(fn: (item: T, i: number) => string | symbol, type?: ObjectConstructor): Record<string | symbol, T[]>;
        groupBy<K>(fn: (item: T, i: number) => K, type: MapConstructor): Map<K, T[]>;
    }
}

Array.prototype.uniq = function () {
    return [...new Set(this)];
};

Array.prototype.first = function () {
    return this[0];
};

Array.prototype.last = function () {
    return this[this.length - 1];
};

Array.prototype.count = function (ele) {
    let count = 0;

    this.forEach((item) => {
        if (item === ele) {
            count++;
        }
    });

    return count;
};

Array.prototype.equals = function (another) {
    if (this.length !== another.length) {
        return false;
    }

    for (let i = 0; i < this.length; i++) {
        if (this[i] !== another[i]) {
            return false;
        }
    }

    return true;
};

Array.prototype.split = function (delimiter) {
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
        chunks.push([]);
    }

    return chunks;
};


Array.prototype.chunk = function (length) {
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

Array.prototype.shuffle = function () {
    for (let i = this.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this[i], this[j]] = [this[j], this[i]];
    }

    return this;
};

Array.prototype.toShuffled = function () {
    return this.slice().shuffle();
};

if (!Array.prototype.toReversed) {
    Array.prototype.toReversed = function () {
        return this.slice().reverse();
    };
}

if (!Array.prototype.toSorted) {
    Array.prototype.toSorted = function (fn) {
        return this.slice().sort(fn);
    };
}

Array.prototype.orderBy = function (key, order = "asc") {
    const items = this.slice();
    items.sort((a, b) => {
        if (typeof a !== "object" || typeof b !== "object" ||
            !a || !b ||
            Array.isArray(a) || Array.isArray(b)
        ) {
            return -1;
        }

        const _a = a[key];
        const _b = b[key];

        if (_a === undefined || _b === undefined) {
            return -1;
        }

        if (typeof _a === "number" && typeof _b === "number") {
            return _a - _b;
        } else if ((typeof _a === "string" && typeof _b === "string")
            || (typeof _a === "bigint" && typeof _b === "bigint")
        ) {
            if (_a < _b) {
                return -1;
            } else if (_a > _b) {
                return 1;
            } else {
                return 1;
            }
        } else {
            return -1;
        }
    });

    if (order === "desc") {
        items.reverse();
    }

    return items;
};

Array.prototype.groupBy = function (
    fn: (item: any, i: number) => any,
    type: ObjectConstructor | MapConstructor = Object
): any {
    if (type === Map) {
        const groups = new Map<any, any[]>();

        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            const key = fn(item, i);
            const list = groups.get(key);

            if (list) {
                list.push(item);
            } else {
                groups.set(key, [item]);
            }
        }

        return groups;
    } else {
        const groups: Record<string | symbol, any[]> = {};

        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            const key = fn(item, i);
            const list = groups[key];

            if (list) {
                list.push(item);
            } else {
                groups[key] = [item];
            }
        }

        return groups;
    }
};
