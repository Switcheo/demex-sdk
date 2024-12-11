import { keccak256 } from "@cosmjs/crypto";
import elliptic from "elliptic";

export const getEvmHexAddress = (compressedPublicKey: Uint8Array) => {
  const publicKey = getUncompressedPublicKey(compressedPublicKey);
  const address = Buffer.from(keccak256(Buffer.from(publicKey, "hex"))).subarray(12).toString("hex");
  return checksumAddress(address);
}

const getUncompressedPublicKey = (compressedPublicKey: Uint8Array) => {
  const ec = new elliptic.ec("secp256k1");
  const key = ec.keyFromPublic(compressedPublicKey);
  return key.getPublic().encode("hex", false).slice(2);
}

const checksumAddress = (unchecksummedAddress: string) => {
  const lowercaseAddress = unchecksummedAddress.toLowerCase().replace("0x", "");
  const hashedAddress = Buffer.from(keccak256(Buffer.from(lowercaseAddress))).toString("hex");
  let checksumAddress = "0x";

  for (let i = 0; i < lowercaseAddress.length; i++) {
    if (parseInt(hashedAddress[i]!, 16) > 7) {
      checksumAddress += lowercaseAddress[i]!.toUpperCase();
    } else {
      checksumAddress += lowercaseAddress[i]!;
    }
  }

  return checksumAddress;
}