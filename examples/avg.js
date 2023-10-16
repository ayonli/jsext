import parallel from "../esm/parallel.js";
const { default: sum } = parallel(() => import("./sum.js"));

/**
 * @param  {...number} values 
 * @returns {Promise<number>}
 */
export default async function avg(...values) {
    return (await sum(...values)) / values.length;
}
