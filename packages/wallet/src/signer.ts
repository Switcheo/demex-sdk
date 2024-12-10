import { AminoSignResponse, makeSignDoc as makeSignDocAmino, OfflineAminoSigner, Secp256k1Wallet, StdSignDoc } from "@cosmjs/amino";
import { toBase64 } from "@cosmjs/encoding";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { AccountData, DirectSecp256k1Wallet, DirectSignResponse, makeSignDoc as makeSignDocProto, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { StdFee } from "@cosmjs/stargate";
import { AminoTypesMap } from "@demex-sdk/amino-types";
import { registry } from "@demex-sdk/codecs";
import { AuthInfo } from "@demex-sdk/codecs/data/cosmos/tx/v1beta1/tx";
import { constructAdr36SignDoc } from "@demex-sdk/core";
import { evmChainIds } from "@demex-sdk/core/src/env";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { WalletError } from "./constant";
import { constructEIP712Tx, EIP712Tx, parseChainId } from "./eip712";
import { DemexSignerTypes } from "./utils";
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
    const signerChainId = await this.getEvmChainId()
    const updatedMemo = await this.updateMemo(signDoc.memo, signDoc.chain_id, signerChainId)
    const updatedSignDoc: StdSignDoc = { ...signDoc, memo: updatedMemo, chain_id: signerChainId }
    const eip712Tx = constructEIP712Tx(updatedSignDoc, signerChainId)
    const signature = await this.signEIP712(address, eip712Tx)
    const sigBz = Uint8Array.from(Buffer.from(signature, 'hex'))
    const pubkey = await this.getPublicKey(address)
    return {
      signature: {
        pub_key: {
          type: "ethermint/PubKeyEthSecp256k1",
          value: Buffer.from(pubkey).toString("base64"),
        },
        // Remove recovery `v` from signature
        signature: toBase64(Buffer.from(sigBz.slice(0, -1)))
      },
      signed: updatedSignDoc
    }
  }

  async signDirect(address: string, signDoc: SignDoc): Promise<DirectSignResponse> {
    const txBody = registry.decodeTxBody(signDoc.bodyBytes)
    const signerChainId = await this.getEvmChainId()
    const updatedMemo = await this.updateMemo(txBody.memo, signDoc.chainId, signerChainId)
    const updatedTxBodyBytes = registry.encodeTxBody({
      ...txBody,
      memo: updatedMemo,
    })
    const updatedProtoSignDoc = makeSignDocProto(updatedTxBodyBytes, signDoc.authInfoBytes, signDoc.chainId, Number(signDoc.accountNumber));
    const authInfo = AuthInfo.decode(signDoc.authInfoBytes)
    const msgs = txBody.messages.map(message => {
      const msg = registry.decode({ ...message })
      return {
        typeUrl: message.typeUrl,
        value: msg,
      }
    }).map(msg => AminoTypesMap.toAmino(msg))
    const fee: StdFee = {
      amount: authInfo.fee?.amount ?? [],
      gas: authInfo.fee?.gasLimit.toString() ?? "0",
    }
    const aminoSignDoc = makeSignDocAmino(msgs, fee, signerChainId, updatedMemo, Number(signDoc.accountNumber), Number(authInfo.signerInfos[0]!.sequence), txBody.timeoutHeight)
    const eip712Tx = constructEIP712Tx(aminoSignDoc, signerChainId)
    const signature = await this.signEIP712(address, eip712Tx)
    const sigBz = Uint8Array.from(Buffer.from(signature, 'hex'))
    const pubkey = await this.getPublicKey(address)
    return {
      signature: {
        pub_key: {
          type: "ethermint/PubKeyEthSecp256k1",
          value: Buffer.from(pubkey).toString("base64"),
        },
        // Remove recovery `v` from signature
        signature: toBase64(Buffer.from(sigBz.slice(0, -1)))
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

  private updateMemo(currentMemo: string = "", docChainId: string, signerChainId: string): string {
    const signDocEvmChainId = parseChainId(evmChainIds[docChainId])
    const signerEvmChainId = parseChainId(signerChainId)
    const updatedMemo = signDocEvmChainId === signerEvmChainId ? currentMemo : `${currentMemo}|CROSSCHAIN-SIGNING|signed-chain-id:${signerEvmChainId};carbon-chain-id:${signDocEvmChainId}`
    return updatedMemo
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
