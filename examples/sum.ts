export default async function sum(...values: number[]): Promise<number> {
    return values.reduce((sum, value) => sum + value, 0);
}
