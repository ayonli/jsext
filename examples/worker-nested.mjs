import run from "../esm/run.js";

/**
 * 
 * @param {import("../run").RunOptions} options 
 * @returns 
 */
export default async function (options) {
    const { workerId, result } = await run(new URL("worker.mjs", import.meta.url).href, ["Alice"], options);

    return {
        pid: process.pid,
        workerId,
        result: await result(),
    };
}
