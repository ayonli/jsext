import { isMain } from "../../esm/module.js";

if (isMain(import.meta)) {
    console.log("foo.mjs is the main module");
}
