import { addShutdownListener } from "../../runtime.ts";
import { sleep } from "../../async.ts";
import { args } from "../../cli.ts";
import process from "node:process";

console.log("ready");

const timer1 = setTimeout(() => {
    // ...
}, 10_000);

const timer2 = setTimeout(() => {
    // ...
}, 10_000);

addShutdownListener(async () => {
    console.log("close 1");
    await sleep(100);
    clearTimeout(timer1);
});

addShutdownListener(async () => {
    console.log("close 2");
    await sleep(200);
    clearTimeout(timer2);
});

if (args.includes("--prevent-exit")) {
    addShutdownListener(event => {
        event.preventDefault();

        setTimeout(() => {
            console.log("manual close");
            process.exit(1);
        }, 2_000);
    });
}
