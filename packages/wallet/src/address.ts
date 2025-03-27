import { keccak256, Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/tendermint-rpc";
import * as Bip39 from "bip39";
import elliptic from "elliptic";

export const secp256k1MnemonicToPrivateKey = (mnemonic: string, hdPath: string):Buffer => {
  const seed = Bip39.mnemonicToSeedSync(mnemonic);
  const result = Slip10.derivePath(Slip10Curve.Secp256k1, seed, stringToPath(hdPath));
  return Buffer.from(result.privkey);
}
export const secp256k1PrivateKeyToPublicKey = (privateKey: Uint8Array | Buffer | string | number[] | elliptic.ec.KeyPair): Buffer => {
  const keypair = new elliptic.ec("secp256k1").keyFromPrivate(privateKey);
  return Buffer.from(keypair.getPublic(true, "hex"), "hex");
}
export const secp256k1PrivateKeyToRawAddress = (privateKey: Uint8Array | Buffer | string | number[] | elliptic.ec.KeyPair) => {
  const publicKey = secp256k1PrivateKeyToPublicKey(privateKey);
  return Buffer.from(rawSecp256k1PubkeyToRawAddress(publicKey));
}

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
  const lowercaseAddress = unchecksummedAddress.toLowerCase().replace(/^0x/i, "");
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
