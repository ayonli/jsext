import { progress } from "../../dialog/index.ts";
import { sleep } from "../../promise/index.ts";

try {
    const result = await progress("Processing...", async () => {
        await sleep(5000);

        return "Success!";
    }, () => {
        throw new Error("Failed!");
    });

    console.log(result);
} catch (err) {
    console.log(String(err));
}
