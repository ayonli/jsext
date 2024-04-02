import { progress } from "../../dialog.ts";
import { sleep } from "../../promise.ts";

const result = await progress("Processing...", async () => {
    await sleep(5000);

    return "Success!";
}, () => {
    return "Failed!";
});

console.log(result);
