import { progress } from "../../dialog.ts";
import { sleep } from "../../promise.ts";

const result = await progress("Processing...", async () => {
    await sleep(5000);

    return "Success!";
});

console.log(result);
