import { refTimer, unrefTimer } from "../../runtime.ts";
import { args } from "../../cli.ts";

console.log("ready");

const timer = setTimeout(() => {
    console.log("close late");
}, 1_000);

if (args.includes("--unref")) {
    unrefTimer(timer);
} else if (args.includes("-ref")) {
    unrefTimer(timer);
    refTimer(timer);
}

