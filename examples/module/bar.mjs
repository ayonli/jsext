import { isMain } from "../../esm/module.js";
import "./foo.mjs";

if (isMain(import.meta)) {
    console.log("bar.mjs is the main module");
}
