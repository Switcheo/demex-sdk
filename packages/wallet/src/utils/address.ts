import { keccak256 } from "@cosmjs/crypto";
import { toHex } from "@cosmjs/encoding";

export const getEvmHexAddress = (pubkey: Uint8Array) => {
  const evmAddressBytes = keccak256(pubkey).slice(-20);
  return "0x".concat(toHex(evmAddressBytes));
}