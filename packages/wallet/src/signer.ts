import { AminoSignResponse, makeSignDoc as makeSignDocAmino, OfflineAminoSigner, Secp256k1Wallet, StdSignDoc } from "@cosmjs/amino";
import { toBech32 } from "@cosmjs/encoding";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { AccountData, DirectSecp256k1Wallet, DirectSignResponse, makeSignDoc as makeSignDocProto, OfflineDirectSigner, TxBodyEncodeObject } from "@cosmjs/proto-signing";
import { StdFee } from "@cosmjs/stargate";
import { AminoTypesMap } from "@demex-sdk/amino-types";
import { registry } from "@demex-sdk/codecs";
import { AuthInfo, TxBody } from "@demex-sdk/codecs/data/cosmos/tx/v1beta1/tx";
import { constructAdr36SignDoc, evmChainIds } from "@demex-sdk/core";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { WalletError } from "./errors";
import { getEvmHexAddress } from "./address";
import { constructEIP712Tx, EIP712Tx } from "./eip712";

export interface EIP712Signer {
  getEvmChainId: () => Promise<string>;
  signEIP712: (hexAddress: string, doc: EIP712Tx) => Promise<string>;
}

export type DemexSigner = DemexDirectSigner | DemexAminoSigner | DemexEIP712Signer;
export type DemexDirectSigner = OfflineDirectSigner & { type: DemexSignerTypes };
export type DemexAminoSigner = OfflineAminoSigner & { type: DemexSignerTypes }

export abstract class DemexEIP712Signer implements DemexDirectSigner, DemexAminoSigner, EIP712Signer {

  type = DemexSignerTypes.EIP712;

  abstract getAccounts(): Promise<readonly AccountData[]>;
  abstract signEIP712(hexAddress: string, doc: EIP712Tx): Promise<string>;
  abstract getEvmChainId(): Promise<string>;

  async signAmino(address: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
    const walletChainId = await this.getEvmChainId()
    const pubkey = await this.getPublicKey(address)
    const hexAddress = getEvmHexAddress(pubkey)
    const evmChainId = evmChainIds[signDoc.chain_id]
    if (!evmChainId) throw new WalletError("unable to obtain evm chain id from signDoc")
    const updatedMemo = await this.updateMemo(signDoc.memo, evmChainId, walletChainId)
    const updatedSignDoc: StdSignDoc = { ...signDoc, memo: updatedMemo, chain_id: evmChainId }
    const eip712Tx = constructEIP712Tx(updatedSignDoc, walletChainId)
    const signature = await this.signEIP712(hexAddress, eip712Tx)
    return {
      signature: {
        pub_key: {
          type: "ethermint/PubKeyEthSecp256k1",
          value: Buffer.from(pubkey).toString("base64"),
        },
        signature: Buffer.from(signature, 'hex').toString('base64'),
      },
      signed: updatedSignDoc
    }
  }

  async signDirect(address: string, signDoc: SignDoc): Promise<DirectSignResponse> {
    const txBody = TxBody.decode(signDoc.bodyBytes)
    const walletChainId = await this.getEvmChainId()
    const evmChainId = evmChainIds[signDoc.chainId]!
    const updatedMemo = await this.updateMemo(txBody.memo, evmChainId, walletChainId)
    const msgs = txBody.messages.map(message => {
      const msg = registry.decode({ ...message })
      return {
        typeUrl: message.typeUrl,
        value: msg,
      }
    })
    const signedTxBodyEncodeObject: TxBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        ...txBody,
        messages: msgs,
        timeoutHeight: BigInt(txBody.timeoutHeight.toString()),
        memo: updatedMemo,
      },
    };
    const updatedTxBodyBytes = registry.encode(signedTxBodyEncodeObject);
    const updatedProtoSignDoc = makeSignDocProto(updatedTxBodyBytes, signDoc.authInfoBytes, evmChainId, Number(signDoc.accountNumber));
    const authInfo = AuthInfo.decode(signDoc.authInfoBytes)
    const fee: StdFee = {
      amount: authInfo.fee?.amount ?? [],
      gas: authInfo.fee?.gasLimit.toString() ?? "0",
    }
    const aminoMsgs = msgs.map(msg => AminoTypesMap.toAmino(msg))
    const aminoSignDoc = makeSignDocAmino(aminoMsgs, fee, evmChainId, updatedMemo, Number(signDoc.accountNumber), Number(authInfo.signerInfos[0]!.sequence), BigInt(txBody.timeoutHeight.toString()))
    const eip712Tx = constructEIP712Tx(aminoSignDoc, walletChainId)
    const pubkey = await this.getPublicKey(address)
    const hexAddress = getEvmHexAddress(pubkey)
    const signature = await this.signEIP712(hexAddress, eip712Tx)
    return {
      signature: {
        pub_key: {
          type: "ethermint/PubKeyEthSecp256k1",
          value: Buffer.from(pubkey).toString("base64"),
        },
        signature: Buffer.from(signature, 'hex').toString('base64'),
      },
      signed: updatedProtoSignDoc
    }
  }

  async getPublicKey(signerAddress: string): Promise<Uint8Array> {
    const accounts = await this.getAccounts();
    const account = accounts.find((account) => account.address === signerAddress);
    if (!account) throw new WalletError("failed to retrieve public key from signer");
    return account.pubkey;
  }

  private updateMemo(currentMemo: string = "", signDocEvmChainId: string, walletChainId: string): string {
    const evmChainId = parseChainId(signDocEvmChainId);
    if (evmChainId === walletChainId) return currentMemo;
    const params: Record<string, string> = { 
      "signed-chain-id": `carbon_${walletChainId}-1`,
      "carbon-chain-id": signDocEvmChainId,
    };
    return [
      currentMemo,
      "CROSSCHAIN-SIGNING",
      Object.entries(params).map((kv) => kv.join(":")).join(";"),
    ].join("|");
  }
}

export class DemexPrivateKeySigner implements DemexDirectSigner, DemexAminoSigner {
  type = DemexSignerTypes.PrivateKey;
  wallet?: DirectSecp256k1Wallet;
  aminoWallet?: Secp256k1Wallet;

  constructor(readonly privateKey: Buffer, readonly prefix: string) { }

  async initWallet() {
    if (!this.wallet) this.wallet = await DirectSecp256k1Wallet.fromKey(this.privateKey, this.prefix);

    return this.wallet;
  }

  async initAminoWallet() {
    if (!this.aminoWallet) this.aminoWallet = await Secp256k1Wallet.fromKey(this.privateKey, this.prefix);
    return this.aminoWallet;
  }

  async getAccounts() {
    const wallet = await this.initWallet();
    return await wallet.getAccounts();
  }

  async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
    const aminoWallet = await this.initAminoWallet();
    return await aminoWallet.signAmino(signerAddress, signDoc);
  }

  async signDirect(signerAddress: string, signDoc: SignDoc): Promise<DirectSignResponse> {
    const wallet = await this.initWallet();
    return await wallet.signDirect(signerAddress, signDoc);
  }

  async signMessage(address: string, message: string): Promise<string> {
    const aminoWallet = await this.initAminoWallet()
    const signedDoc = await aminoWallet.signAmino(address, constructAdr36SignDoc(address, message))
    return Buffer.from(signedDoc.signature.signature, 'base64').toString('hex')
  }
}


export class DemexNonSigner implements DemexDirectSigner {
  type = DemexSignerTypes.PublicKey;

  async getAccounts(): Promise<readonly AccountData[]> {
    throw new WalletError("signing not available");
  }

  async signDirect(): Promise<DirectSignResponse> {
    throw new WalletError("signing not available");
  }

  async signMessage(address: string, message: string): Promise<string> { // eslint-disable-line
    throw new WalletError("signing not available");
  }
}


// Uses amino because ledger does not work with protobuf yet
export class DemexLedgerSigner extends LedgerSigner {
  type = DemexSignerTypes.Ledger;
}

export enum DemexSignerTypes {
  Ledger = 'Ledger',
  PrivateKey = 'PrivateKey',
  PublicKey = 'PublicKey',
  EIP712 = 'EIP712',
}

export interface AccountAddresses {
  bech32Address: string;
  evmBech32Address?: string;
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

export const getDefaultSignerAddresses = async (signer: DemexSigner, bech32Prefix: string): Promise<AccountAddresses> => {
  return {
    bech32Address: await getDefaultSignerAddress(signer),
    evmBech32Address: await getDefaultSignerEvmAddress(signer, bech32Prefix),
  }
}

export function isDemexEIP712Signer(signer: DemexSigner): boolean {
  return signer.type === DemexSignerTypes.EIP712
}

export function parseChainId(evmChainId?: string): string {
  if (!evmChainId) {
    throw new WalletError("chain-id is undefined")
  }
  const chainId = evmChainId.trim()

  if (chainId.length > 48) {
    throw new WalletError(`chain-id '${chainId}' cannot exceed 48 chars`)
  }

  if (!chainId.match(/^[a-z]+_\d+-\d+$/)) {
    throw new WalletError(`chain-id '${chainId}' does not conform to the required format`)
  }
  return chainId.split("_")[1]?.split("-")[0] ?? ''
}

