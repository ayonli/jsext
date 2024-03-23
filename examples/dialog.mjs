import { alert, confirm, prompt, progress } from "../esm/dialog/index.js";
import { sleep } from "../esm/promise/index.js";

const message = await prompt("Input message:", "Processing...");

if (message) {
    const ok = await confirm(`Confirm using '${message}' as title?`);

    if (ok) {
        const result = await progress(message, async (set, signal) => {
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

            return { message: "Success!" };
        }, () => {
            // throw new Error("Aborted!");
            return { message: "Failed!" };
        });

        // console.log(result.message);

        await alert(result.message);
    }
}
