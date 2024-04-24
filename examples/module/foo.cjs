import("../../esm/module.js").then(({ isMain }) => {
    if (isMain(module)) {
        console.log("foo.cjs is the main module");
    }
});
