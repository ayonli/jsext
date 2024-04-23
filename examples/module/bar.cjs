const { isMain } = require("../../cjs/module.js");
require("./foo.cjs");

if (isMain(module)) {
    console.log("bar.cjs is the main module");
}
