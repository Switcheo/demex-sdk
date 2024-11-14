import fs from "fs";
import path from "path";

const files = process.argv;

const queryFiles = files.slice(2, files.length - 1);
const [registryFile] = files.slice(-1);

const deconflictMap: Record<string, string> = {
  "Switcheo/carbon/fee/query": "demexFee",
  "Switcheo/carbon/bank/query": "demexBank",
  "cosmos/gov/v1/query": "govV1",
  "cosmos/gov/v1beta1/query": "govV1beta1",
  "ibc/applications/fee/v1/query": "ibcFee",
}

const capitalize = (input: string) => input[0].toUpperCase().concat(input.slice(1));

fs.appendFileSync(registryFile, "\n// Query Clients\n");
for (const file of queryFiles) {
  const exported = require(path.join("../", file));
  if (exported.QueryClientImpl || exported.ServiceClientImpl) {
    const clientType = exported.QueryClientImpl ? "QueryClientImpl" : "ServiceClientImpl";
    const [part1, part0] = exported.protobufPackage.split(".").slice(-2) as string[];
    const relativePath = path.relative(path.dirname(registryFile), file).replace(/\.ts$/i, "");

    // use deconflicted module name if specified
    let moduleName = deconflictMap[relativePath]
    // otherwise extract module name from file path
    if (!moduleName) moduleName = (!part0 || part0.match(/^v\d+/i)) ? part1 : part0;

    const clientName = `${capitalize(moduleName)}QueryClient`;
    fs.appendFileSync(registryFile, `\nexport { ${clientType} as ${clientName} } from './${relativePath}';`)
  }
}
fs.appendFileSync(registryFile, "\n");
