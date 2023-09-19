const fs = require("fs");
const pkg = require("./package.json");

delete pkg.type;

fs.writeFileSync("./package.json", JSON.stringify(pkg, null, "    ") + "\n", "utf8");
