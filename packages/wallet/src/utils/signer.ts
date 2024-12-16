import { toBech32 } from "@cosmjs/encoding"
import { WalletError } from "../constant";
import { DemexSigner } from "../signer";
import { getEvmHexAddress } from "./address";


export enum DemexSignerTypes {
  Ledger = 'Ledger',
  PrivateKey = 'PrivateKey',
  PublicKey = 'PublicKey',
  EIP712 = 'EIP712',
}

export const getDefaultSignerAddress = async (signer: DemexSigner) => {
  const account = await getDefaultSignerAccount(signer);
  return account.address;
}

export const getDefaultSignerAccount = async (signer: DemexSigner) => {
  const [account] = await signer.getAccounts();
  if (!account) throw new WalletError('failed to get account from signer')
  return account
}

export const getDefaultSignerEvmAddress = async (signer: DemexSigner, bech32Prefix: string) => {
  const account = await getDefaultSignerAccount(signer);
  const hexAddress = getEvmHexAddress(account.pubkey);
  const evmAddressBytes = Buffer.from(hexAddress.slice(2), "hex");
  return toBech32(bech32Prefix, evmAddressBytes);

}

export const getDefaultSignerAddresses = async (signer: DemexSigner, bech32Prefix: string) => {
  return {
    bech32Address: await getDefaultSignerAddress(signer),
    evmBech32Address: await getDefaultSignerEvmAddress(signer, bech32Prefix),
  }
}

export function isDemexEIP712Signer(signer: DemexSigner): boolean {
  return signer.type === DemexSignerTypes.EIP712
}