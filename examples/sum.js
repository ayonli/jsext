/**
 * @param  {...number} values 
 * @returns {Promise<number>}
 */
export default async function sum(...values) {
    return values.reduce((sum, value) => sum + value, 0);
}
