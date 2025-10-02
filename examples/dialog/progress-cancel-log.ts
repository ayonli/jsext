import { progress } from "../../dialog.ts";
import { sleep } from "../../async.ts";

let log: string | null = null;
const result = await progress("Processing...", async () => {
    await sleep(5000);

    return "Success!";
}, () => {
    log = "Canceled";
});

console.log(result);
console.log(log);
