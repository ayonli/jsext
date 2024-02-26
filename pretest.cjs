const fs = require("fs");
const pkg = require("./package.json");

pkg.type = "module";

fs.writeFileSync("./package.json", JSON.stringify(pkg, null, "    ") + "\n", "utf8");
