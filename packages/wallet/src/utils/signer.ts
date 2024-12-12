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

export const getDefaultSignerEvmAddress = async (signer: DemexSigner) => {
  const account = await getDefaultSignerAccount(signer);
  return getEvmHexAddress(account.pubkey);
}

export function isDemexEIP712Signer(signer: DemexSigner): boolean {
  return signer.type === DemexSignerTypes.EIP712
}