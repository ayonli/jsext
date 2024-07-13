import { addUnhandledRejectionListener } from "../../runtime.ts";
import { args } from "../../cli.ts";
import process from "node:process";

setTimeout(() => {
    process.exit(0);
}, 1_000);

if (args.includes("--no-action")) {
    addUnhandledRejectionListener(() => {

    });
} else if (args.includes("--log")) {
    addUnhandledRejectionListener((event) => {
        console.log(String(event.reason));
        console.log(event.promise instanceof Promise);
    });
} else if (args.includes("--prevent-exit")) {
    addUnhandledRejectionListener((event) => {
        console.log(String(event.reason));
        event.preventDefault();
    });
}

Promise.resolve().then(() => {
    throw new Error("Unintentional error");
});
