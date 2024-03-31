import * as fs from "fs";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));

delete pkg.type;
fs.writeFileSync("./package.json", JSON.stringify(pkg, null, "    ") + "\n", "utf8");
