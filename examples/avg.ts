import parallel from "../parallel.ts";
const { default: sum } = parallel(() => import("./sum.ts"));

export default async function avg(...values: number[]): Promise<number> {
    return (await sum(...values)) / values.length;
}
