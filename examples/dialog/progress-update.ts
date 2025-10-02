import { progress } from "../../dialog.ts";
import { sleep } from "../../async.ts";

const result = await progress("Processing...", async (set, signal) => {
    set({ percent: 0 });

    if (!signal.aborted) {
        await sleep(1000);
        set({ percent: 20 });
    }

    if (!signal.aborted) {
        await sleep(1000);
        set({ percent: 50, message: "Halfway there!" });
    }

    if (!signal.aborted) {
        await sleep(1000);
        set({ percent: 80 });
    }

    if (!signal.aborted) {
        await sleep(1000);
        set({ percent: 100 });
    }

    return "Success!";
});

console.log(result);
process.exit(0);
