import { sha256 } from "@cosmjs/crypto";
import { toBech32 } from "@cosmjs/encoding";

export const getModuleAddress = (moduleKey: string, prefix: string) => {
  const addressHash = sha256(Buffer.from(moduleKey, "utf8"));
  return toBech32(prefix, addressHash);
}
