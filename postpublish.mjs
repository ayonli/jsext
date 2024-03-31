import * as fs from "fs";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));

pkg.type = "module";
fs.writeFileSync("./package.json", JSON.stringify(pkg, null, "    ") + "\n", "utf8");
