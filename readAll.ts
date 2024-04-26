/**
 * Reads all streaming data at once.
 * @module
 */

import { asAsyncIterable } from "./util.ts";

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
export default async function readAll<T>(source: AsyncIterable<T> | ReadableStream<T>): Promise<T[]> {
    const iterable = asAsyncIterable(source)!;

    const list: T[] = [];

    for await (const chunk of iterable) {
        list.push(chunk);
    }

    return list;
}
