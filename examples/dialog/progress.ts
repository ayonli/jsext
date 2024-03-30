import { progress } from "../../dialog/index.ts";
import { sleep } from "../../promise/index.ts";

const result = await progress("Processing...", async () => {
    await sleep(5000);

    return "Success!";
});

console.log(result);
