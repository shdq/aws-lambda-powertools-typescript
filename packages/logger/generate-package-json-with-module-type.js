const fs = require("fs");
const path = require("path");

const outDir = "./lib";
async function generatePackageJsonWithModuleType() {
  fs.readdir(outDir, function (err, dirs) {
    if (err) throw err;
    dirs.forEach(function (dir) {
      if (dir === "cjs" || dir === "esm") {
        const file = path.join(outDir, dir, "/package.json");
        if (!fs.existsSync(file)) {
          const content =
            dir === "cjs" ? { type: "commonjs" } : { type: "module" };
          fs.writeFile(file, JSON.stringify(content), content, function (err) {
            if (err) throw err;
          });
        }
      }
    });
  });
}

generatePackageJsonWithModuleType();
