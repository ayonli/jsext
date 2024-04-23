const { isMain } = require("../../cjs/module.js");

if (isMain(module)) {
    console.log("foo.cjs is the main module");
}
