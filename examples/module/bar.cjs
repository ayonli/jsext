require("./foo.cjs");

import("../../esm/module.js").then(({ isMain }) => {
    if (isMain(module)) {
        console.log("bar.cjs is the main module");
    }
});
