import { alert, confirm, prompt, progress } from "../../esm/dialog.js";
import { sleep } from "../../esm/promise.js";

await (async () => {
    const email = await prompt("Input email:", "john.doe@example.com");

    if (!email)
        return;

    const password = await prompt("Input password:", { type: "password" });

    if (!password)
        return;

    const ok = await confirm(`Confirm using email '${email}'?`);

    if (!ok)
        return;

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

        return { message: "Success!" };
    }, () => {
        // throw new Error("Aborted!");
        return { message: "Failed!" };
    });

    await alert((result?.message ?? "") + ` Email: ${email}; password: ${password}`);
})();
