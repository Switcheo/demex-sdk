import * as fs from "fs";
import * as path from "path";

const PACKAGE_JSON_PATH = path.join(__dirname, "..", "package.json");
const TYPES_DIR = path.join(__dirname, "..", "dist-types", "data");

async function generateTypesVersions() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));

  const topLevelDirs = fs.readdirSync(TYPES_DIR)
    .filter(file => fs.statSync(path.join(TYPES_DIR, file)).isDirectory());

  const typesVersions = {
    "*": {
      ".": ["./dist-types/index.d.ts"],
      ...Object.fromEntries(
        topLevelDirs.map(dir => [
          `${dir}/*`,
          [`./dist-types/data/${dir}/*`]
        ])
      )
    }
  };

  packageJson.typesVersions = typesVersions;

  fs.writeFileSync(
    PACKAGE_JSON_PATH,
    JSON.stringify(packageJson, null, 2) + "\n"
  );

  console.log("Updated typesVersions in package.json");
  console.log("Added mappings for:", topLevelDirs);
}

generateTypesVersions().catch(console.error);