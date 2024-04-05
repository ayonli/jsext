import { asIterable } from './util.js';

/**
 * Reads all streaming data at once.
 * @module
 */
/**
 * Reads all values from the iterable object at once.
 *
 * @example
 * ```ts
 * import readAll from "@ayonli/jsext/readAll";
 * import * as fs from "node:fs";
 *
 * const file = fs.createReadStream("./package.json");
 * const chunks = await readAll(file);
 *
 * console.log(chunks);
 * ```
 */
async function readAll(source) {
    const iterable = asIterable(source);
    const list = [];
    for await (const chunk of iterable) {
        list.push(chunk);
    }
    return list;
}

export { readAll as default };
//# sourceMappingURL=readAll.js.map
