import { DemexEIP712Signer, DemexSigner } from "../signer"

export const getSignerAddress = async (signer: DemexSigner) => {
  return (await signer.getAccounts())[0].address;
}

export const getSignerEvmAddress = async (signer: DemexSigner) => {
  if (isDemexEIP712Signer(signer)) return (signer as DemexEIP712Signer).getEvmAddress();
}

export function isDemexEIP712Signer(signer: DemexSigner): boolean {
  return typeof (signer as DemexEIP712Signer).signEIP712 === "function"
}